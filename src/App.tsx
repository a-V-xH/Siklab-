import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, signIn, logOut, testConnection, OperationType, handleFirestoreError, connectWallet } from './lib/firebase';
import { UserProfile, Thread, Category } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Search, 
  Plus, 
  LogOut, 
  LogIn,
  Menu,
  User,
  Sun,
  Moon,
  Wallet
} from 'lucide-react';

// Views - Note: We will create these next
import HomeView from './components/HomeView';
import ThreadView from './components/ThreadView';
import ProfileView from './components/ProfileView';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'thread' | 'profile'>('home');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    author: '',
    dateRange: 'all', // all, today, week, month
    categoryId: ''
  });

  const setSelectedCategory = (catId: string | null) => {
    setFilters(prev => ({ ...prev, categoryId: catId || '' }));
  };

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          let currentUserData: UserProfile;

          if (!userDoc.exists()) {
            const isAdminEmail = ['honeyzel09181994@gmail.com', 'gocrypto94@gmail.com'].includes(firebaseUser.email || '');
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: isAdminEmail ? 'admin' : 'user',
              createdAt: Date.now(),
            };
            await setDoc(userDocRef, {
              ...newUser,
              createdAt: serverTimestamp()
            });
            currentUserData = newUser;
            setUser(newUser);
          } else {
            currentUserData = userDoc.data() as UserProfile;
            setUser(currentUserData);
          }

          // Redirect to profile if this was an active login attempt
          if (isLoggingIn) {
            handleUserClick(firebaseUser.uid);
            setIsLoggingIn(false);
          }
        } catch (error) {
          console.error("Error fetching user details", error);
          // Fallback to basic info from firebase auth
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'user',
            createdAt: Date.now(),
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats.sort((a, b) => a.order - b.order));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    const seedCategories = async () => {
      if (user?.role === 'admin' && categories.length === 0) {
        const initialCategories = [
          { name: 'General Chat', description: 'Usapang kahit ano.', icon: 'message-square', order: 1 },
          { name: 'Tech & Gadgets', description: 'Tech related stuff.', icon: 'cpu', order: 2 },
          { name: 'Marketplace', description: 'Buy and sell.', icon: 'shopping-cart', order: 3 },
          { name: 'Life & Living', description: 'Lifestyle and tips.', icon: 'heart', order: 4 },
          { name: 'Siklab Feed', description: 'Latest news and updates.', icon: 'flame', order: 5 },
        ];
        for (const cat of initialCategories) {
          try {
            await setDoc(doc(collection(db, 'categories')), cat);
          } catch (e) {
            console.error("Seeding error", e);
          }
        }
      }
    };

    if (user?.role === 'admin' && categories.length === 0) {
      seedCategories();
    }

    return () => {
      unsubscribeAuth();
      unsubscribeCategories();
    };
  }, []);

  const handleThreadClick = (id: string) => {
    setSelectedThreadId(id);
    setView('thread');
    window.scrollTo(0, 0);
  };

  const handleUserClick = (uid: string) => {
    setSelectedUserId(uid);
    setView('profile');
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    setSelectedThreadId(null);
    setSelectedUserId(null);
    setView('home');
    window.scrollTo(0, 0);
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      await signIn();
    } catch (error) {
      setIsLoggingIn(false);
      console.error("Login failed", error);
    }
  };

  const handleWalletSignIn = async () => {
    try {
      const address = await connectWallet();
      // For now, since we use Firebase Auth for real user profiles, 
      // we'll just check if they are logged in and link it.
      // If not logged in, we inform them to login with Google first then link.
      if (!user) {
        alert("Mangyaring mag-log in muna gamit ang Google, pagkatapos ay i-link ang iyong MetaMask sa iyong profile.");
        handleSignIn();
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          walletAddress: address
        });
        alert("Matagumpay na na-link ang iyong MetaMask!");
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A] text-white">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Flame className="w-12 h-12 text-[#FF4E00]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0A0A0A] text-gray-200' : 'bg-[#F2F5F8] text-[#1A202C]'} font-sans selection:bg-[var(--brand-primary)] selection:text-white`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-[#0A0A0A]/80' : 'bg-white/80'} backdrop-blur-md border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} px-4 py-3`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <div className="relative">
              <Flame className="w-8 h-8 text-[var(--brand-primary)] fill-[var(--brand-primary)]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--brand-primary)] rounded-full animate-pulse filter blur-[4px]"></div>
            </div>
            <span className={`text-2xl font-bold tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-black'}`}>SIKLAB</span>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="Maghanap ng thread..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border rounded-full py-2 pl-10 pr-12 focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors text-sm`}
              />
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors ${showFilters || Object.values(filters).some(v => v && v !== 'all') ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                <Menu className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {/* Filter Dropdown */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-black/10'} shadow-2xl z-[60]`}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Author</label>
                      <input 
                        type="text"
                        placeholder="Username..."
                        value={filters.author}
                        onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                        className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 ${theme === 'light' ? 'text-black' : 'text-white'}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Petsa</label>
                        <select 
                          value={filters.dateRange}
                          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--brand-primary)]/50 ${theme === 'light' ? 'text-black' : 'text-white'}`}
                        >
                          <option value="all" className="bg-[#0A0A0A] text-white">Lahat ng Oras</option>
                          <option value="today" className="bg-[#0A0A0A] text-white">Ngayong Araw</option>
                          <option value="week" className="bg-[#0A0A0A] text-white">Ngayong Linggo</option>
                          <option value="month" className="bg-[#0A0A0A] text-white">Ngayong Buwan</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Kategorya</label>
                        <select 
                          value={filters.categoryId}
                          onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--brand-primary)]/50 ${theme === 'light' ? 'text-black' : 'text-white'}`}
                        >
                          <option value="" className="bg-[#0A0A0A] text-white">Lahat</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-[#0A0A0A] text-white">{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setFilters({ author: '', dateRange: 'all', categoryId: '' })}
                        className="flex-1 text-xs font-bold text-gray-500 hover:text-white transition-colors"
                      >
                        RESET
                      </button>
                      <button 
                        onClick={() => setShowFilters(false)}
                        className="flex-1 bg-[var(--brand-primary)] text-white py-2 rounded-lg text-xs font-bold"
                      >
                        APPLY
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'} transition-colors`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => handleUserClick(user.uid)}
                  className={`flex items-center gap-2 p-1 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} rounded-full border group cursor-pointer hover:border-[var(--brand-primary)]/50 transition-colors`}
                >
                  <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover" />
                  <span className={`hidden sm:inline text-xs font-semibold px-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{user.displayName.split(' ')[0]}</span>
                </div>
                <button onClick={logOut} className={`p-2 hover:text-[var(--brand-primary)] transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'} rounded-full border`}>
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : null}
            <button className="md:hidden text-white ml-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-[60vh]">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView 
              key="home"
              categories={categories} 
              onThreadClick={handleThreadClick} 
              onUserClick={handleUserClick}
              onSignIn={handleSignIn}
              onWalletConnect={handleWalletSignIn}
              user={user}
              theme={theme}
              searchQuery={searchQuery}
              searchFilters={filters}
              onCategoryChange={setSelectedCategory}
            />
          )}
          {view === 'thread' && (
            <ThreadView 
              key="thread"
              threadId={selectedThreadId!} 
              onBack={goHome}
              onUserClick={handleUserClick}
              onSignIn={handleSignIn}
              user={user}
            />
          )}
          {view === 'profile' && (
            <ProfileView 
              key="profile"
              userId={selectedUserId!}
              currentUser={user}
              onBack={goHome}
              onThreadClick={handleThreadClick}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 mt-20 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-6 h-6 text-[#FF4E00] fill-[#FF4E00]" />
              <span className="text-xl font-bold tracking-tighter text-white">SIKLAB</span>
            </div>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Ang pinaka-sleek at modernong Pinoy community hub. Dito ay nagkakaisa ang mga Pilipino sa pagbabahagi ng kaalaman, tech tips, at masayang talakayan.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-[10px] tracking-widest opacity-40">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Tungkol sa Siklab</li>
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Patakaran (Rules)</li>
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Gabay sa Paggamit</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6 uppercase text-[10px] tracking-widest opacity-40">Community</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Discord</li>
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Facebook Group</li>
              <li className="hover:text-[#FF4E00] cursor-pointer transition-colors">Twitter Feed</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-gray-600 uppercase tracking-widest">
          <span>&copy; 2026 Siklab Community. All rights reserved.</span>
          <span>Made with ❤️ in the Philippines</span>
        </div>
      </footer>
    </div>
  );
}
