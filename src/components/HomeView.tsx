import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Category, Thread, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Eye, Clock, Plus, ChevronRight, TrendingUp, Flame, LogIn, User, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HomeViewProps {
  categories: Category[];
  onThreadClick: (id: string) => void;
  onUserClick: (uid: string) => void;
  onSignIn: () => void;
  onWalletConnect?: () => void;
  user: UserProfile | null;
  theme: 'dark' | 'light';
  searchQuery: string;
  searchFilters: {
    author: string;
    dateRange: string;
    categoryId: string;
  };
  onCategoryChange: (catId: string | null) => void;
  key?: string;
}

export default function HomeView({ 
  categories, 
  onThreadClick, 
  onUserClick, 
  onSignIn, 
  onWalletConnect,
  user, 
  theme,
  searchQuery,
  searchFilters,
  onCategoryChange
}: HomeViewProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newThread, setNewThread] = useState({ title: '', content: '', categoryId: '' });

  useEffect(() => {
    // Current category is either from sidebar or search filter
    const activeCategoryId = searchFilters.categoryId;

    let q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'), limit(50));
    
    if (activeCategoryId) {
      q = query(collection(db, 'threads'), where('categoryId', '==', activeCategoryId), orderBy('createdAt', 'desc'), limit(50));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now(),
        } as Thread;
      });
      setThreads(ts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'threads');
    });

    return () => unsubscribe();
  }, [searchFilters.categoryId]);

  const filteredThreads = React.useMemo(() => {
    return threads.filter(thread => {
      // Search Query
      const queryLower = searchQuery.toLowerCase();
      const matchesQuery = !searchQuery || 
        thread.title.toLowerCase().includes(queryLower) || 
        thread.content.toLowerCase().includes(queryLower);

      // Author Filter
      const matchesAuthor = !searchFilters.author || 
        thread.authorName.toLowerCase().includes(searchFilters.author.toLowerCase());

      // Date Range Filter
      let matchesDate = true;
      if (searchFilters.dateRange !== 'all') {
        const now = Date.now();
        const threadDate = thread.createdAt;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (searchFilters.dateRange === 'today') {
          matchesDate = now - threadDate < oneDay;
        } else if (searchFilters.dateRange === 'week') {
          matchesDate = now - threadDate < 7 * oneDay;
        } else if (searchFilters.dateRange === 'month') {
          matchesDate = now - threadDate < 30 * oneDay;
        }
      }

      return matchesQuery && matchesAuthor && matchesDate;
    });
  }, [threads, searchQuery, searchFilters]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newThread.title || !newThread.content || !newThread.categoryId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'threads'), {
        title: newThread.title.trim(),
        content: newThread.content.trim(),
        categoryId: newThread.categoryId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous Sparky',
        authorPhotoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        viewCount: 0,
        replyCount: 0,
        likeCount: 0,
      });
      setIsCreating(false);
      setNewThread({ title: '', content: '', categoryId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'threads');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTitle = async (threadId: string) => {
    if (!editTitle.trim()) {
      setEditingThreadId(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'threads', threadId), {
        title: editTitle.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingThreadId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `threads/${threadId}`);
    }
  };

  const selectedCategory = searchFilters.categoryId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-8"
    >
      {/* Main Thread List */}
      <div className="lg:col-span-3 space-y-8 px-4 sm:px-0">
        {!selectedCategory && (
          <div className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden relative min-h-[400px] flex flex-col md:flex-row items-center p-8 md:p-12 mb-8">
            <div className="flex-1 space-y-6 relative z-10 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[var(--brand-primary)]/20">
                <Flame className="w-3 h-3" />
                Siklab Community
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] leading-[1.1] tracking-tight">
                Sumiklab sa <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] brightness-125">Katalinuhan.</span>
              </h1>
              <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md leading-relaxed">
                Ang pinakamainit na tagpuan ng mga ideya, diskusyon, at koneksyon. Sumali na sa usapin!
              </p>
              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>500+ Online Sparkies</span>
                </div>
                
                {user && !user.walletAddress && (
                  <button 
                    onClick={onWalletConnect}
                    className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-3 py-1.5 rounded-full text-[10px] font-bold border border-orange-500/20 transition-all"
                  >
                    <Wallet className="w-3 h-3" />
                    LINK METAMASK
                  </button>
                )}
              </div>
            </div>
            
            <div className="w-full md:w-1/2 h-[350px] md:h-[450px] relative flex items-center justify-center overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: [0, -15, 0]
                }}
                transition={{ 
                  opacity: { duration: 1.2, ease: "easeOut" },
                  scale: { duration: 1.2, ease: "easeOut" },
                  y: { repeat: Infinity, duration: 6, ease: [0.45, 0, 0.55, 1] }
                }}
                className="relative flex flex-col items-center"
              >
                <div className="relative group p-12">
                  {/* Layered Branding Iconography */}
                  <div className="relative z-10 w-32 h-32 md:w-56 md:h-56">
                    {/* Deep Emissive Layer */}
                    <Flame className="absolute inset-0 w-full h-full text-[var(--brand-primary)] fill-[var(--brand-primary)] blur-xl opacity-40" />
                    
                    {/* Inner Core Glow */}
                    <motion.div
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <Flame className="absolute inset-0 w-full h-full text-[var(--brand-primary)] fill-[var(--brand-primary)] blur-md opacity-60" />
                    </motion.div>

                    {/* Sharp Main Logo */}
                    <Flame className="relative w-full h-full text-[var(--brand-primary)] fill-[var(--brand-primary)]" />
                  </div>

                  {/* Elegant Orbital Particles */}
                  {[...Array(4)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        rotate: 360,
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 8 + i * 2,
                        ease: "linear",
                        delay: i * -2
                      }}
                      className="absolute inset-0 pointer-events-none p-4"
                    >
                      <motion.div 
                        animate={{ 
                          opacity: [0, 1, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 4, delay: i * 0.5 }}
                        className="w-1.5 h-1.5 bg-orange-200 rounded-full blur-[2px] shadow-[0_0_10px_#FFD700]"
                        style={{ 
                          position: 'absolute', 
                          top: `${20 + i * 15}%`, 
                          right: `${10 + i * 5}%` 
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--brand-primary)]/5 blur-[100px] rounded-full" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[var(--brand-primary)]/5 blur-[100px] rounded-full" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Trendings Threads'}
          </h2>
          {user && (
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-[var(--brand-primary)] text-white px-4 py-2 rounded-full text-sm font-bold transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Gumawa ng Post</span>
            </button>
          )}
        </div>

        {/* Create Thread Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <form onSubmit={handleCreateThread} className="bg-white/5 border border-[var(--brand-primary)]/30 rounded-2xl p-6 space-y-4">
                <input 
                  type="text" 
                  placeholder="Pamagat ng iyong thread..."
                  required
                  value={newThread.title}
                  onChange={e => setNewThread({ ...newThread, title: e.target.value })}
                  className="w-full bg-transparent text-xl font-bold text-[var(--text-primary)] focus:outline-none placeholder:text-gray-600"
                />
                <textarea 
                  placeholder="Ano ang iyong gustong pag-usapan?"
                  required
                  rows={4}
                  value={newThread.content}
                  onChange={e => setNewThread({ ...newThread, content: e.target.value })}
                  className="w-full bg-transparent text-sm text-[var(--text-secondary)] focus:outline-none placeholder:text-gray-600 resize-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <select 
                    required
                    value={newThread.categoryId}
                    onChange={e => setNewThread({ ...newThread, categoryId: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-[var(--text-secondary)]"
                  >
                    <option value="" disabled className="bg-[#0A0A0A]">Pumili ng Kategorya</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0A0A0A] text-white">{c.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-gray-500 hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
                    >
                      Kanselahin
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-[var(--brand-primary)]/20 transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Sinisiklab...
                        </>
                      ) : (
                        'SIKLAB!'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thread List */}
        <div className="space-y-3">
          {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <motion.div 
                key={thread.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onThreadClick(thread.id)}
                className="group bg-white/5 hover:bg-white/[0.08] border border-white/5 p-5 rounded-2xl cursor-pointer transition-all hover:border-white/10"
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); onUserClick(thread.authorId); }}
                    className="flex-shrink-0 relative group/avatar"
                  >
                    <img 
                      src={thread.authorPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.authorId}`} 
                      alt={thread.authorName} 
                      className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover/avatar:border-[var(--brand-primary)]/50 transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0A0A0A] rounded-full"></div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                      <span className="text-[var(--brand-primary)]">{categories.find(c => c.id === thread.categoryId)?.name || 'General'}</span>
                      <span className="w-1 h-1 bg-[var(--border-color)] rounded-full"></span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUserClick(thread.authorId); }}
                        className="hover:text-[var(--text-primary)] transition-colors"
                      >
                        {thread.authorName}
                      </button>
                      <span className="w-1 h-1 bg-[var(--border-color)] rounded-full"></span>
                      <span>{formatDistanceToNow(thread.createdAt)} ago</span>
                      {user?.uid === thread.authorId && (
                        <>
                          <span className="w-1 h-1 bg-[var(--border-color)] rounded-full"></span>
                          <span className="text-[var(--brand-primary)] opacity-50">Iyong Post</span>
                        </>
                      )}
                    </div>
                    {editingThreadId === thread.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveTitle(thread.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(thread.id);
                          if (e.key === 'Escape') setEditingThreadId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white/10 text-lg font-bold text-[var(--text-primary)] px-2 py-1 rounded-lg focus:outline-none border border-[var(--brand-primary)]/50"
                      />
                    ) : (
                      <h3 
                        onClick={(e) => {
                          if (user?.uid === thread.authorId) {
                            e.stopPropagation();
                            setEditingThreadId(thread.id);
                            setEditTitle(thread.title);
                          }
                        }}
                        className={`text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1 leading-tight ${user?.uid === thread.authorId ? 'cursor-edit' : ''}`}
                        title={user?.uid === thread.authorId ? 'Click to edit title' : ''}
                      >
                        {thread.title}
                      </h3>
                    )}
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                      {thread.content}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-xs font-mono">{thread.replyCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs font-mono">{thread.viewCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center">
              <div className="opacity-20">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <p>Walang nahanap na thread sa iyong pinili.</p>
              </div>
              {(searchQuery || Object.values(searchFilters).some(v => v && v !== 'all')) && (
                <button 
                  onClick={() => onCategoryChange(null)}
                  className="mt-4 text-[var(--brand-primary)] font-bold text-sm hover:underline"
                >
                  I-clear ang lahat ng filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Right Corner */}
      <div className="lg:col-span-1 space-y-6">
        {/* Consolidated Sidebar Section */}
        <div className="flex flex-col gap-6 sticky top-24">
          {/* Premium Widget - Enhanced */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0A0A0A] rounded-[2.5rem] p-8 text-white overflow-hidden relative group cursor-pointer border border-white/5 shadow-2xl shadow-black/50"
          >
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/20 via-transparent to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-primary)] to-[#FF8A00] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Flame className="w-7 h-7 text-white fill-white/20" />
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0A0A0A] bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=pro${i}`} alt="pro user" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full border-2 border-[#0A0A0A] bg-[var(--brand-primary)] flex items-center justify-center text-[8px] font-black">+1k</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[9px] font-black text-[var(--brand-primary)] uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--brand-primary)]"></span>
                  </span>
                  Limited Slot
                </div>
                <h3 className="font-black text-3xl tracking-tight leading-tight">Maging <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[#FF8A00]">Sparky Pro!</span></h3>
                <p className="text-xs text-white/50 font-medium leading-relaxed max-w-[200px]">
                  Buksan ang pinto sa exclusive features, custom badges, at ad-free experience.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => user ? onWalletConnect?.() : onSignIn()}
                  className="w-full bg-white text-black py-3.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all hover:bg-[var(--brand-primary)] hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--brand-primary)]/30 active:scale-95"
                >
                  {user?.walletAddress ? 'PRO ACTIVE' : 'MAG-UPGRADE NA'}
                </button>
              </div>

              <div className="flex items-center gap-4 pt-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-[var(--brand-primary)] rounded-full"></div>
                  No Ads
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-[var(--brand-primary)] rounded-full"></div>
                  Badges
                </div>
              </div>
            </div>

            {/* Decorative background flame */}
            <Flame className="absolute -bottom-10 -right-10 w-48 h-48 text-[var(--brand-primary)]/5 rotate-12 group-hover:scale-125 group-hover:rotate-6 group-hover:text-[var(--brand-primary)]/10 transition-all duration-700 ease-out" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
