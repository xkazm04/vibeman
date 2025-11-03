import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';

/**
 * This component displays a user profile fetched from an API.
 * It shows a loading state, then renders the user's name, email,
 * and an edit button with a fade-in animation via framer-motion.
 *
 * Last updated: 2025-09-20
 */
const API_URL = 'https://api.example.com';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${
        userId
      }`);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="user-profile"
    >
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      <Button onClick={() => console.log('Edit profile')}>
        Edit Profile
      </Button>
    </motion.div>
  );
}
