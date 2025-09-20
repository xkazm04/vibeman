import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { unusedImport } from '../utils/unused';

const UNUSED_CONSTANT = 'this is not used anywhere';
const API_URL = 'https://api.example.com';

function unusedFunction() {
  return 'this function is never called';
}

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const unusedVariable = 'not used';

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`);
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