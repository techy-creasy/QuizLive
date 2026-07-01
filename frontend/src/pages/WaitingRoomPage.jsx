import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { roomAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import { Avatar, Badge, Card, Button, Spinner } from '../components/ui';

const WaitingRoomPage = () => {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const emit = useSocketEmit();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await roomAPI.getByCode(roomCode);
        setRoom(res.data.room);
        setParticipants(res.data.room.participants || []);
        setChatMessages(res.data.room.chatMessages || []);
        // Join socket room
        emit('join-room', { roomCode });
      } catch {
        toast.error('Room not found');
        navigate('/join');
      } finally {
        setLoading(false);
      }
    };
    loadRoom();
  }, [roomCode]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useSocketEvent('room-joined', ({ room: r }) => {
    setRoom(r);
    setParticipants(r.participants || []);
  });

  useSocketEvent('participant-joined', ({ user: newUser }) => {
    setParticipants(prev => {
      if (prev.find(p => (p.user?._id || p.user) === newUser._id)) return prev;
      return [...prev, { user: newUser, name: newUser.name, avatar: newUser.avatar, isConnected: true }];
    });
  });

  useSocketEvent('participant-left', ({ userId }) => {
    setParticipants(prev =>
      prev.map(p => (p.user?._id || p.user) === userId ? { ...p, isConnected: false } : p)
    );
  });

  useSocketEvent('chat-message', (msg) => {
    setChatMessages(prev => [...prev, msg]);
  });

  useSocketEvent('quiz-started', () => {
    toast.success('Quiz is starting!');
  });

  useSocketEvent('new-question', (question) => {
    // Navigate to quiz page when first question arrives, carrying the question data
    navigate(`/room/${roomCode}/quiz`, { state: { initialQuestion: question } });
  });

  useSocketEvent('kicked', ({ message }) => {
    toast.error(message);
    navigate('/join');
  });

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    emit('chat-message', { roomCode, message: chatInput.trim() });
    setChatInput('');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Waiting for host to start
        </div>
        <h1 className="text-3xl font-display font-bold">{room?.quiz?.title}</h1>
        <p className="text-slate-400 mt-2">{room?.quiz?.description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-slate-400">
          <span>Hosted by</span>
          <Avatar src={room?.host?.avatar} name={room?.host?.name} size="sm" />
          <span className="font-medium text-slate-200">{room?.host?.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participants */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Players</h2>
            <Badge color="green">{participants.filter(p => p.isConnected).length} online</Badge>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
                <Avatar src={p.avatar} name={p.name} size="sm" />
                <span className={`text-sm font-medium ${(p.user?._id || p.user) === user?._id ? 'text-primary-400' : 'text-slate-200'}`}>
                  {p.name} {(p.user?._id || p.user) === user?._id && '(you)'}
                </span>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-6">No one here yet...</p>
            )}
          </div>
        </Card>

        {/* Chat */}
        <Card className="p-5 flex flex-col">
          <h2 className="font-display font-semibold mb-4">Chat</h2>
          <div
            ref={chatRef}
            className="flex-1 min-h-48 max-h-64 overflow-y-auto space-y-2 mb-4 pr-1"
          >
            {chatMessages.length === 0 && (
              <p className="text-center text-slate-500 text-sm pt-8">Be the first to say hi! 👋</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.user === user?._id ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                  msg.user === user?._id
                    ? 'bg-primary-500/20 border border-primary-500/30 text-primary-100'
                    : 'bg-slate-700/70 text-slate-200'
                }`}>
                  {msg.user !== user?._id && (
                    <p className="text-xs text-slate-400 mb-1 font-medium">{msg.name}</p>
                  )}
                  <p>{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <input
              className="input-field flex-1 !py-2 text-sm"
              placeholder="Say something..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              maxLength={200}
            />
            <Button type="submit" size="sm" disabled={!chatInput.trim()}>
              Send
            </Button>
          </form>
        </Card>
      </div>

      {/* Quiz info */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <Card className="p-4">
          <div className="text-2xl font-display font-bold text-primary-400">
            {room?.quiz?.questions?.length || 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Questions</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-display font-bold text-accent-400">
            {participants.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Players</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-display font-bold text-green-400">
            Ready
          </div>
          <div className="text-xs text-slate-400 mt-1">Status</div>
        </Card>
      </div>
    </div>
  );
};

export default WaitingRoomPage;
