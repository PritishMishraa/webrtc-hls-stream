export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            WebRTC + HLS Streaming
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience real-time video communication with WebRTC and live streaming with HLS.
            Connect with others via peer-to-peer video calls, or watch the live stream as it happens.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Stream Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📹</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Streaming</h2>
              <p className="text-gray-600">
                Join the live video call using WebRTC. Connect your camera and microphone
                to participate in real-time conversations.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Real-time WebRTC communication
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Camera and microphone controls
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Multiple participants support
              </div>
            </div>

            <a
              href="/stream"
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Join Stream
            </a>
          </div>

          {/* Watch Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📺</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Watch Live</h2>
              <p className="text-gray-600">
                Watch the live conversation via HLS streaming. Experience the broadcast
                with adaptive quality and low latency.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                HLS adaptive streaming
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Low latency live viewing
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Works in any browser
              </div>
            </div>

            <a
              href="/watch"
              className="block w-full bg-purple-500 hover:bg-purple-600 text-white text-center py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Watch Stream
            </a>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">1️⃣</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">WebRTC Connection</h4>
              <p className="text-sm text-gray-600">
                Users connect via mediasoup SFU for real-time peer-to-peer video communication
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">2️⃣</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">HLS Transcoding</h4>
              <p className="text-sm text-gray-600">
                FFmpeg converts the live video stream into HLS format for broader compatibility
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">3️⃣</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Live Viewing</h4>
              <p className="text-sm text-gray-600">
                Viewers can watch the live conversation with low latency via HLS streaming
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Built with Next.js, TypeScript, mediasoup, and FFmpeg
          </p>
        </div>
      </div>
    </div>
  );
}
