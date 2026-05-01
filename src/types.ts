export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  walletAddress?: string;
  role: 'user' | 'admin';
  createdAt: number;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

export interface Thread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  categoryId: string;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
  replyCount: number;
  likeCount: number;
}

export interface Comment {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
