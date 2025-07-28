'use client';

import { useEffect, useRef, useState } from 'react';

export default function WatchPage() {
    const [isStreamAvailable, setIsStreamAvailable] = useState(false);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        checkStreamAvailability();

        // Check every 5 seconds if stream becomes available
        const interval = setInterval(checkStreamAvailability, 5000);

        return () => clearInterval(interval);
    }, []);

    const checkStreamAvailability = async () => {
        try {
            const response = await fetch('/hls/stream.m3u8');
            if (response.ok) {
                setIsStreamAvailable(true);
                setError('');
                initializeHLSPlayer();
            } else {
                setIsStreamAvailable(false);
                if (!error) {
                    setError('No active stream found. Start streaming first.');
                }
            }
        } catch (err) {
            setIsStreamAvailable(false);
            if (!error) {
                setError('No active stream found. Start streaming first.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const initializeHLSPlayer = () => {
        if (videoRef.current && isStreamAvailable) {
            const video = videoRef.current;

            // Check if HLS is natively supported
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = '/hls/stream.m3u8';
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(console.error);
                });
            } else {
                // For browsers that don't support HLS natively, you would typically use hls.js
                // For now, we'll show an error message
                setError('Your browser does not support HLS playback natively. Please use Safari or install hls.js for full compatibility.');
            }
        }
    };

    const refreshStream = () => {
        setIsLoading(true);
        setError('');
        checkStreamAvailability();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Live Watch</h1>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Stream Status</h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <div
                                    className={`w-3 h-3 rounded-full mr-2 ${isStreamAvailable ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                ></div>
                                <span className={isStreamAvailable ? 'text-green-600' : 'text-red-600'}>
                                    {isLoading ? 'Checking...' : isStreamAvailable ? 'Live' : 'Offline'}
                                </span>
                            </div>
                            <button
                                onClick={refreshStream}
                                disabled={isLoading}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                {isLoading ? 'Checking...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    ⚠️
                                </div>
                                <div className="ml-3">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Live Stream</h3>

                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        {isStreamAvailable ? (
                            <video
                                ref={videoRef}
                                controls
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center">
                                    {isLoading ? (
                                        <>
                                            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                                📡
                                            </div>
                                            <p className="text-lg">Checking for live stream...</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                📵
                                            </div>
                                            <p className="text-lg mb-2">No Live Stream</p>
                                            <p className="text-sm text-gray-400">
                                                Go to <a href="/stream" className="text-blue-400 hover:text-blue-300 underline">/stream</a> to start broadcasting
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {isStreamAvailable && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        🔴
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-800">
                                        Live HLS Stream Active
                                    </p>
                                    <p className="text-sm text-green-600">
                                        You are watching the live conversation via HLS
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">About HLS Streaming</h3>
                    <div className="space-y-3 text-gray-600">
                        <p>
                            <strong>HLS (HTTP Live Streaming)</strong> provides a reliable way to watch live content with adaptive bitrate streaming.
                        </p>
                        <p>
                            • <strong>Low Latency:</strong> ~2-6 seconds delay from live stream
                        </p>
                        <p>
                            • <strong>Adaptive Quality:</strong> Automatically adjusts to your connection
                        </p>
                        <p>
                            • <strong>Reliable Delivery:</strong> Works through CDNs and firewalls
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <a
                        href="/stream"
                        className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium"
                    >
                        Join Stream
                    </a>
                </div>
            </div>
        </div>
    );
} 