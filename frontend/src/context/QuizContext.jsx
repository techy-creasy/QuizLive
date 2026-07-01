import { createContext, useContext, useState, useCallback } from 'react';

const QuizContext = createContext(null);

export const QuizProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionState, setQuestionState] = useState('waiting'); // waiting | active | answered | results
  const [myAnswer, setMyAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  const resetQuiz = useCallback(() => {
    setRoom(null);
    setCurrentQuestion(null);
    setLeaderboard([]);
    setTimeLeft(0);
    setQuestionState('waiting');
    setMyAnswer(null);
    setAnswerResult(null);
  }, []);

  return (
    <QuizContext.Provider value={{
      room, setRoom,
      currentQuestion, setCurrentQuestion,
      leaderboard, setLeaderboard,
      timeLeft, setTimeLeft,
      questionState, setQuestionState,
      myAnswer, setMyAnswer,
      answerResult, setAnswerResult,
      resetQuiz,
    }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used within QuizProvider');
  return ctx;
};
