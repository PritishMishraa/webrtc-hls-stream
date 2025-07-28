'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MediasoupClient } from '@/lib/mediasoup-client';

export default function StreamPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [mediasoupClient, setMediasoupClient] = useState<MediasoupClient | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [error, setError] = useState<string>('');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

    useEffect(() => {
        const socketConnection = io('https://webrtc-hls-stream.fly.dev');
        setSocket(socketConnection);

        socketConnection.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
        });

        socketConnection.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        socketConnection.emit('join-room', { roomId: 'main-room' });

        return () => {
            socketConnection.disconnect();
        };
    }, []);

    useEffect(() => {
        if (socket && isConnected) {
            const client = new MediasoupClient(socket);
            setMediasoupClient(client);

            client.initialize().catch((err) => {
                console.error('Failed to initialize mediasoup client:', err);
                setError('Failed to initialize WebRTC connection');
            });

            client.onNewProducer(async (producerId) => {
                try {
                    const remoteStream = await client.consume(producerId);
                    setRemoteStreams(prev => new Map(prev.set(producerId, remoteStream)));
                } catch (err) {
                    console.error('Failed to consume remote stream:', err);
                }
            });
        }
    }, [socket, isConnected]);

    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        remoteStreams.forEach((stream, producerId) => {
            const videoElement = remoteVideosRef.current.get(producerId);
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        });
    }, [remoteStreams]);

    const startLocalStream = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            setLocalStream(stream);
            setIsCameraOn(true);
            setIsMicOn(true);

            if (mediasoupClient) {
                await mediasoupClient.createSendTransport();
                await mediasoupClient.createRecvTransport();

                // Produce video and audio tracks
                const videoTrack = stream.getVideoTracks()[0];
                const audioTrack = stream.getAudioTracks()[0];

                if (videoTrack) {
                    await mediasoupClient.produce(videoTrack);
                }
                if (audioTrack) {
                    await mediasoupClient.produce(audioTrack);
                }
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera/microphone. Please check permissions.');
        }
    };

    const stopLocalStream = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            setIsCameraOn(false);
            setIsMicOn(false);
        }
    };

    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        }
    };

    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Live Stream</h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Connection Status</h2>
                        <div className="flex items-center">
                            <div
                                className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                            ></div>
                            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {!localStream ? (
                            <button
                                onClick={startLocalStream}
                                disabled={!isConnected}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                            >
                                Start Streaming
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={stopLocalStream}
                                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium"
                                >
                                    Stop Streaming
                                </button>
                                <button
                                    onClick={toggleCamera}
                                    className={`px-6 py-2 rounded-lg font-medium ${isCameraOn
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                                        }`}
                                >
                                    {isCameraOn ? 'Camera On' : 'Camera Off'}
                                </button>
                                <button
                                    onClick={toggleMic}
                                    className={`px-6 py-2 rounded-lg font-medium ${isMicOn
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                                        }`}
                                >
                                    {isMicOn ? 'Mic On' : 'Mic Off'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Local Video */}
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">Your Video</h3>
                        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {!localStream && (
                                <div className="absolute inset-0 flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                            📹
                                        </div>
                                        <p>Camera Off</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    <div className="bg-white rounded-lg shadow-lg p-4">
                        <h3 className="text-lg font-semibold mb-4">
                            Remote Participants ({remoteStreams.size})
                        </h3>
                        <div className="space-y-4">
                            {remoteStreams.size === 0 ? (
                                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                            👥
                                        </div>
                                        <p>Waiting for participants...</p>
                                    </div>
                                </div>
                            ) : (
                                Array.from(remoteStreams.entries()).map(([producerId, stream]) => (
                                    <div key={producerId} className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                                        <video
                                            ref={(el) => {
                                                if (el) {
                                                    remoteVideosRef.current.set(producerId, el);
                                                    el.srcObject = stream;
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <a
                        href="/watch"
                        className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium"
                    >
                        View HLS Stream
                    </a>
                </div>
            </div>
        </div>
    );
} 