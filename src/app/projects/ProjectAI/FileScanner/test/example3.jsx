import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import { validateEmail } from '../utils/validation';
import { unusedUtility } from '../utils/unused';

const UNUSED_THEME = {
  primary: '#007bff',
  secondary: '#6c757d'
};

const MAX_ITEMS = 10;

function unusedComponent() {
  return <div>This component is never used</div>;
}

export default function TaskList({ tasks, onTaskUpdate }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const unusedState = useState(false);

  const filteredTasks = useCallback(() => {
    let filtered = tasks;
    
    if (filter === 'completed') {
      filtered = tasks.filter(task => task.completed);
    } else if (filter === 'pending') {
      filtered = tasks.filter(task => !task.completed);
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return a.title.localeCompare(b.title);
    });
  }, [tasks, filter, sortBy]);

  const handleTaskToggle = (taskId) => {
    onTaskUpdate(taskId, { completed: !tasks.find(t => t.id === taskId).completed });
  };

  return (
    <div className="task-list">
      <div className="filters">
        <button 
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'active' : ''}
        >
          All Tasks
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'active' : ''}
        >
          Pending
        </button>
        <button 
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? 'active' : ''}
        >
          Completed
        </button>
      </div>

      <div className="sort-controls">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Sort by Date</option>
          <option value="title">Sort by Title</option>
        </select>
      </div>

      <div className="tasks">
        {filteredTasks().slice(0, MAX_ITEMS).map(task => (
          <div key={task.id} className="task-item">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleTaskToggle(task.id)}
            />
            <span className={task.completed ? 'completed' : ''}>
              {task.title}
            </span>
            <span className="task-date">
              {formatDate(task.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}