import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="bubble-received inline-flex items-center gap-1 px-4 py-3">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
};

export default TypingIndicator;
