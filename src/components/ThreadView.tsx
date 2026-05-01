import React, { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  increment,
  getDoc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Thread, Comment, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MessageSquare, 
  User, 
  Clock, 
  Send,
  MoreHorizontal,
  Flame,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreadViewProps {
  threadId: string;
  onBack: () => void;
  onUserClick: (uid: string) => void;
  onSignIn: () => void;
  user: UserProfile | null;
  key?: string;
}

export default function ThreadView({ threadId, onBack, onUserClick, onSignIn, user }: ThreadViewProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Thread
    const threadRef = doc(db, 'threads', threadId);
    
    // Increment view count immediately
    updateDoc(threadRef, {
      viewCount: increment(1)
    }).catch(err => console.error("Update view error", err));

    const unsubscribeThread = onSnapshot(threadRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setThread({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now(),
        } as Thread);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `threads/${threadId}`);
    });

    // 2. Fetch Comments
    const commentsRef = collection(db, 'threads', threadId, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribeComments = onSnapshot(qComments, (snapshot) => {
      const cs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now(),
        } as Comment;
      });
      setComments(cs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `threads/${threadId}/comments`);
    });

    return () => {
      unsubscribeThread();
      unsubscribeComments();
    };
  }, [threadId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !thread) return;

    try {
      const content = newComment;
      setNewComment(''); // Clear early for UX
      
      const commentsRef = collection(db, 'threads', threadId, 'comments');
      await addDoc(commentsRef, {
        content,
        threadId,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL,
        createdAt: serverTimestamp()
      });

      // Update thread reply count
      await updateDoc(doc(db, 'threads', threadId), {
        replyCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `threads/${threadId}/comments`);
    }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Flame className="w-8 h-8 mx-auto text-[var(--brand-primary)]" />
      </motion.div>
    </div>
  );

  if (!thread) return (
    <div className="py-20 text-center">
      <p>Hindi mahanap ang thread na ito.</p>
      <button onClick={onBack} className="text-[var(--brand-primary)] font-bold mt-4">BUMALIK SA HOME</button>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group mb-4"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Bumalik sa lahat ng threads</span>
      </button>

      {/* Main Post */}
      <article className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group/author"
              onClick={() => onUserClick(thread.authorId)}
            >
              <div className="relative">
                <img 
                  src={thread.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.authorId}`} 
                  alt={thread.authorName} 
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10 group-hover/author:border-[var(--brand-primary)]/50 transition-colors shadow-2xl shadow-black/20"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0A0A0A] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-[var(--text-primary)] leading-none group-hover/author:text-[var(--brand-primary)] transition-colors">{thread.authorName}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider mt-1">{formatDistanceToNow(thread.createdAt)} ago</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight">{thread.title}</h1>
        </header>

        <div className="text-[var(--text-primary)] leading-relaxed text-lg whitespace-pre-wrap opacity-90">
          {thread.content}
        </div>

        <footer className="pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
              <MessageSquare className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>{thread.replyCount} MGA SAGOT</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
              <Flame className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>{thread.viewCount} MGA NANONOOD</span>
            </div>
          </div>
        </footer>
      </article>

      {/* Reply Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          Mga Usapan
          <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-[var(--text-secondary)]">{comments.length}</span>
        </h3>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleAddComment} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 focus-within:border-[var(--brand-primary)]/30 transition-all">
            <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <textarea 
                placeholder="Ibahagi ang iyong opinyon..." 
                rows={2}
                required
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-gray-600 resize-none pt-1"
              />
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="bg-[var(--brand-primary)] hover:opacity-90 text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-[var(--brand-primary)]/10"
                >
                  <Send className="w-3 h-3" />
                  MAG-SEND
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)] italic">Dapat kang <button onClick={onSignIn} className="text-[var(--brand-primary)] font-bold underline">mag-log in</button> para makasagot sa thread na ito.</p>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={comment.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`} 
                      alt={comment.authorName} 
                      className="w-8 h-8 rounded-lg object-cover cursor-pointer"
                      onClick={() => onUserClick(comment.authorId)}
                    />
                    <div className="flex flex-col">
                      <button 
                        onClick={() => onUserClick(comment.authorId)}
                        className="text-xs font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors text-left"
                      >
                        {comment.authorName}
                      </button>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{formatDistanceToNow(comment.createdAt)} ago</span>
                    </div>
                  </div>
                  <button className="text-gray-600 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap pl-11">
                  {comment.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
