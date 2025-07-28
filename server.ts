import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import * as mediasoup from 'mediasoup';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Mediasoup configuration
const mediasoupConfig = {
    worker: {
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
        logLevel: 'warn' as const,
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp',
        ] as const,
    },
    router: {
        mediaCodecs: [
            {
                kind: 'audio' as const,
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video' as const,
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000,
                },
            },
        ],
    },
    webRtcTransport: {
        listenIps: [
            {
                ip: '127.0.0.1',
                announcedIp: null,
            },
        ],
        maxIncomingBitrate: 1500000,
        initialAvailableOutgoingBitrate: 1000000,
    },
};

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
const transports = new Map();
const producers = new Map();
const consumers = new Map();

// HLS configuration
const hlsOutputPath = path.join(process.cwd(), 'public', 'hls');

async function createWorker() {
    worker = await mediasoup.createWorker({
        ...mediasoupConfig.worker,
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp',
        ], // Remove 'as const' to avoid readonly assignment error
    });

    worker.on('died', (error) => {
        console.error('mediasoup worker died', error);
        setTimeout(() => process.exit(1), 2000);
    });

    router = await worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs,
    });

    return worker;
}

async function createWebRtcTransport() {
    // Fix: mediasoup@3.x requires webRtcServer or listenInfos, not listenIps directly
    const { listenIps, ...restConfig } = mediasoupConfig.webRtcTransport;
    const transport = await router.createWebRtcTransport({
        listenIps: listenIps.map((ipObj: { ip: string; announcedIp: string | null }) => ({
            ip: ipObj.ip,
            announcedIp: ipObj.announcedIp || undefined,
        })),
        ...restConfig,
    });

    transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
            transport.close();
        }
    });

    return transport;
}

app.prepare().then(async () => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Initialize mediasoup
    await createWorker();

    // Ensure HLS directory exists
    if (!fs.existsSync(hlsOutputPath)) {
        fs.mkdirSync(hlsOutputPath, { recursive: true });
    }

    const io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join-room', async ({ roomId }) => {
            socket.join(roomId);
            console.log(`Client ${socket.id} joined room ${roomId}`);
        });

        socket.on('get-router-rtp-capabilities', (callback) => {
            callback(router.rtpCapabilities);
        });

        socket.on('create-webrtc-transport', async ({ direction }, callback) => {
            try {
                const transport = await createWebRtcTransport();
                transports.set(socket.id + '-' + direction, transport);

                callback({
                    params: {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    },
                });
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Error creating WebRTC transport:', error);
                    callback({ error: error.message });
                } else {
                    console.error('Error creating WebRTC transport:', error);
                    callback({ error: String(error) });
                }
            }
        });

        socket.on('connect-transport', async ({ direction, dtlsParameters }, callback) => {
            try {
                const transport = transports.get(socket.id + '-' + direction);
                await transport.connect({ dtlsParameters });
                callback({ success: true });
            } catch (error) {
                console.error('Error connecting transport:', error);
                if (error instanceof Error) {
                    callback({ error: error.message });
                } else {
                    callback({ error: String(error) });
                }
            }
        });

        socket.on('produce', async ({ kind, rtpParameters }, callback) => {
            try {
                const transport = transports.get(socket.id + '-send');
                const producer = await transport.produce({ kind, rtpParameters });
                producers.set(producer.id, producer);

                // Start HLS streaming for video producers
                if (kind === 'video') {
                    startHLSStream(producer);
                }

                // Notify other clients in the room
                socket.broadcast.emit('new-producer', { producerId: producer.id });

                callback({ id: producer.id });
            } catch (error) {
                console.error('Error producing:', error);
                if (error instanceof Error) {
                    callback({ error: error.message });
                } else {
                    callback({ error: String(error) });
                }
            }
        });

        socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
            try {
                if (!router.canConsume({ producerId, rtpCapabilities })) {
                    callback({ error: 'Cannot consume' });
                    return;
                }

                const transport = transports.get(socket.id + '-recv');
                const consumer = await transport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true,
                });

                consumers.set(consumer.id, consumer);

                callback({
                    params: {
                        id: consumer.id,
                        producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    },
                });
            } catch (error) {
                console.error('Error consuming:', error);
                if (error instanceof Error) {
                    callback({ error: error.message });
                } else {
                    callback({ error: String(error) });
                }
            }
        });

        socket.on('resume-consumer', async ({ consumerId }, callback) => {
            try {
                const consumer = consumers.get(consumerId);
                await consumer.resume();
                callback({ success: true });
            } catch (error) {
                console.error('Error resuming consumer:', error);
                if (error instanceof Error) {
                    callback({ error: error.message });
                } else {
                    callback({ error: String(error) });
                }
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Clean up transports
            const sendTransport = transports.get(socket.id + '-send');
            const recvTransport = transports.get(socket.id + '-recv');

            if (sendTransport) {
                sendTransport.close();
                transports.delete(socket.id + '-send');
            }

            if (recvTransport) {
                recvTransport.close();
                transports.delete(socket.id + '-recv');
            }
        });
    });

    async function startHLSStream(producer: mediasoup.types.Producer) {
        try {
            // Create a plain transport for FFmpeg
            const plainTransport = await router.createPlainTransport({
                listenIp: { ip: '127.0.0.1' },
                rtcpMux: false,
                comedia: false,
            });

            // Create consumer for the producer
            const consumer = await plainTransport.consume({
                producerId: producer.id,
                rtpCapabilities: router.rtpCapabilities,
            });

            const rtpPort = plainTransport.tuple.localPort;
            const rtcpPort = plainTransport.rtcpTuple?.localPort;

            // FFmpeg command for HLS
            const outputPath = path.join(hlsOutputPath, 'stream.m3u8');

            ffmpeg()
                .input(`rtp://127.0.0.1:${rtpPort}`)
                .inputFormat('rtp')
                .addOption('-f', 'hls')
                .addOption('-hls_time', '2')
                .addOption('-hls_list_size', '3')
                .addOption('-hls_flags', 'delete_segments')
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('FFmpeg started:', commandLine);
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                })
                .on('end', () => {
                    console.log('FFmpeg finished');
                })
                .run();

            // Connect the plain transport
            await plainTransport.connect({
                ip: '127.0.0.1',
                port: rtpPort,
                rtcpPort: rtcpPort,
            });

            console.log('HLS stream started');
        } catch (error) {
            console.error('Error starting HLS stream:', error);
        }
    }

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
}); 