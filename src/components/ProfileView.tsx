import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  collectionGroup 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, connectWallet } from '../lib/firebase';
import { UserProfile, Thread, Comment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MessageSquare, 
  Flame, 
  Edit3, 
  Check, 
  X, 
  Calendar,
  Mail,
  Activity,
  Wallet,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface ProfileViewProps {
  userId: string;
  currentUser: UserProfile | null;
  onBack: () => void;
  onThreadClick: (id: string) => void;
  key?: string;
}

export default function ProfileView({ userId, currentUser, onBack, onThreadClick }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userThreads, setUserThreads] = useState<Thread[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ displayName: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threads' | 'comments'>('threads');

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    setLoading(true);
    
    // 1. Fetch Profile
    const profileRef = doc(db, 'users', userId);
    const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setEditData({ displayName: data.displayName, bio: data.bio || '' });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });

    // 2. Fetch User's Threads
    const threadsQuery = query(
      collection(db, 'threads'), 
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeThreads = onSnapshot(threadsQuery, (snap) => {
      const ts = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      } as Thread));
      setUserThreads(ts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'threads');
    });

    // 3. Fetch User's Comments using Collection Group
    const commentsQuery = query(
      collectionGroup(db, 'comments'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeComments = onSnapshot(commentsQuery, (snap) => {
      const cs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      } as Comment));
      setUserComments(cs);
    }, (error) => {
      console.warn("Collection Group query failed - likely index required", error);
      // Fallback: search limited comments or just show 0 if index hasn't been created yet
    });

    return () => {
      unsubscribeProfile();
      unsubscribeThreads();
      unsubscribeComments();
    };
  }, [userId]);

  const handleUpdate = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: editData.displayName,
        bio: editData.bio
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const handleConnectWallet = async () => {
    if (!currentUser) return;
    try {
      const address = await connectWallet();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        walletAddress: address
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Activity className="w-8 h-8 mx-auto text-[var(--brand-primary)]" />
      </motion.div>
    </div>
  );

  if (!profile) return (
    <div className="py-20 text-center">
      <p>Hindi mahanap ang profile na ito.</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header / Banner */}
      <div className="relative">
        <div className="h-48 w-full bg-gradient-to-r from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/40 rounded-3xl border border-white/5" />
        <div className="absolute -bottom-12 left-8 flex items-end gap-6">
          <div className="w-32 h-32 rounded-3xl bg-[#111] border-4 border-[var(--bg-app)] overflow-hidden shadow-2xl relative group">
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
              alt={profile.displayName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="pb-4 space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{profile.displayName}</h1>
              {profile.role === 'admin' && (
                <span className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-black uppercase px-2 py-0.5 rounded border border-[var(--brand-primary)]/20 tracking-widest">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-medium flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Joined {format(profile.createdAt || Date.now(), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        {isOwnProfile && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute bottom-4 right-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2"
          >
            <Edit3 className="w-3 h-3" />
            EDIT PROFILE
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        {/* Bio & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">BIO</h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] block">DISPLAY NAME</label>
                    <input 
                      type="text" 
                      value={editData.displayName}
                      onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] block">BIO</label>
                    <textarea 
                      value={editData.bio}
                      onChange={e => setEditData({ ...editData, bio: e.target.value })}
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 text-white resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      onClick={handleUpdate}
                      className="flex-1 bg-[var(--brand-primary)] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Check className="w-3 h-3" /> SAVE
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed italic">
                  {profile.bio || 'Wala pang bio ang user na ito.'}
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">ACTIVITY STATS</h3>
              
              {/* Wallet Section */}
              <div className="bg-gradient-to-br from-orange-500/10 to-transparent rounded-2xl p-4 border border-orange-500/10 overflow-hidden relative group">
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    <Wallet className="w-3 h-3" />
                    Crypto Wallet
                  </div>
                  {profile.walletAddress && (
                    <a 
                      href={`https://etherscan.io/address/${profile.walletAddress}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-orange-400 hover:text-orange-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {profile.walletAddress ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-gray-400 break-all">{profile.walletAddress}</div>
                  </div>
                ) : (
                  isOwnProfile && (
                    <button 
                      onClick={handleConnectWallet}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg shadow-orange-500/20"
                    >
                      Connect MetaMask
                    </button>
                  )
                )}
                {!profile.walletAddress && !isOwnProfile && (
                  <div className="text-[10px] text-gray-500 italic">No wallet connected.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                    <Flame className="w-3 h-3 text-[var(--brand-primary)]" />
                    Threads
                  </div>
                  <div className="text-xl font-black text-white">{userThreads.length}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                    <MessageSquare className="w-3 h-3 text-[var(--brand-primary)]" />
                    Comments
                  </div>
                  <div className="text-xl font-black text-white">{userComments.length}</div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500 uppercase tracking-wider">Email</span>
                  <span className="text-gray-300">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500 uppercase tracking-wider">Last Active</span>
                  <span className="text-[var(--brand-primary)]">
                    {(() => {
                      const latestThread = userThreads[0]?.createdAt || 0;
                      const latestComment = userComments[0]?.createdAt || 0;
                      const lastActive = Math.max(latestThread, latestComment, profile.createdAt || 0);
                      return format(lastActive, 'MMM d, p');
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-6 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('threads')}
              className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'threads' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Threads Posted
              {activeTab === 'threads' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-primary)]" />
              )}
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'threads' && (
              userThreads.length > 0 ? (
                userThreads.map(thread => (
                  <motion.div 
                    key={thread.id}
                    onClick={() => onThreadClick(thread.id)}
                    className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 p-5 rounded-2xl cursor-pointer transition-all hover:border-white/10"
                  >
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                        <Flame className="w-3 h-3 text-[var(--brand-primary)]" />
                        <span>{formatDistanceToNow(thread.createdAt)} ago</span>
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1">
                        {thread.title}
                      </h3>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                        <span>{thread.viewCount} Views</span>
                        <span>{thread.replyCount} Replies</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center opacity-20">
                  <Flame className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm">Wala pang nakasulat na thread ang user na ito.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatDistanceToNow(date: number) {
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
