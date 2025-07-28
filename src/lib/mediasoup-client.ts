/* eslint-disable @typescript-eslint/no-explicit-any */
import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';

export class MediasoupClient {
    private device: Device;
    private socket: Socket;
    private sendTransport: any;
    private recvTransport: any;
    private producers: Map<string, any> = new Map();
    private consumers: Map<string, any> = new Map();

    constructor(socket: Socket) {
        this.socket = socket;
        this.device = new Device();
    }

    async initialize() {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit('get-router-rtp-capabilities', async (rtpCapabilities: any) => {
                try {
                    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async createSendTransport() {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit('create-webrtc-transport', { direction: 'send' }, async (data: any) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }

                this.sendTransport = this.device.createSendTransport(data.params);

                this.sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
                    this.socket.emit('connect-transport', { dtlsParameters, direction: 'send' }, (response: any) => {
                        if (response.error) {
                            errback(new Error(response.error));
                        } else {
                            callback();
                        }
                    });
                });

                this.sendTransport.on('produce', async (parameters: any, callback: any, errback: any) => {
                    this.socket.emit('produce', {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                    }, (response: any) => {
                        if (response.error) {
                            errback(new Error(response.error));
                        } else {
                            callback({ id: response.id });
                        }
                    });
                });

                resolve();
            });
        });
    }

    async createRecvTransport() {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit('create-webrtc-transport', { direction: 'recv' }, async (data: any) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }

                this.recvTransport = this.device.createRecvTransport(data.params);

                this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
                    this.socket.emit('connect-transport', { dtlsParameters, direction: 'recv' }, (response: any) => {
                        if (response.error) {
                            errback(new Error(response.error));
                        } else {
                            callback();
                        }
                    });
                });

                resolve();
            });
        });
    }

    async produce(track: MediaStreamTrack) {
        try {
            const producer = await this.sendTransport.produce({ track });
            this.producers.set(producer.id, producer);
            return producer;
        } catch (error) {
            console.error('Error producing:', error);
            throw error;
        }
    }

    async consume(producerId: string) {
        return new Promise<MediaStream>((resolve, reject) => {
            this.socket.emit('consume', {
                producerId,
                rtpCapabilities: this.device.rtpCapabilities,
            }, async (data: any) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }

                try {
                    const consumer = await this.recvTransport.consume({
                        id: data.params.id,
                        producerId: data.params.producerId,
                        kind: data.params.kind,
                        rtpParameters: data.params.rtpParameters,
                    });

                    this.consumers.set(consumer.id, consumer);

                    const stream = new MediaStream();
                    stream.addTrack(consumer.track);

                    // Resume the consumer
                    this.socket.emit('resume-consumer', { consumerId: consumer.id }, (response: any) => {
                        if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve(stream);
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    onNewProducer(callback: (producerId: string) => void) {
        this.socket.on('new-producer', ({ producerId }) => {
            callback(producerId);
        });
    }

    getDevice() {
        return this.device;
    }

    getSendTransport() {
        return this.sendTransport;
    }

    getRecvTransport() {
        return this.recvTransport;
    }

    cleanup() {
        this.producers.forEach(producer => producer.close());
        this.consumers.forEach(consumer => consumer.close());
        if (this.sendTransport) this.sendTransport.close();
        if (this.recvTransport) this.recvTransport.close();
    }
} 