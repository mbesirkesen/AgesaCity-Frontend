import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle2, XCircle, ChevronRight, Trophy } from 'lucide-react';
import { useGame } from '../context/GameContext';

export default function KnowledgeCenter() {
  const { level, quizzes, quizOptions, learningContents, submitQuiz } = useGame();
  const towerUnlocked = level >= 5;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [lastReward, setLastReward] = useState(null);
  const [expandedContent, setExpandedContent] = useState(null);

  const questionsWithOptions = useMemo(() => {
    if (!quizzes.length || !quizOptions.length) return [];
    return quizzes.map((q) => ({
      ...q,
      options: quizOptions
        .filter((o) => o.question_id === q.question_id)
        .sort((a, b) => a.option_order - b.option_order),
    }));
  }, [quizzes, quizOptions]);

  const currentQuestion = questionsWithOptions[currentIndex] ?? null;
  const isCorrect = currentQuestion && selectedOption === currentQuestion.correct_option_id;

  async function handleAnswer(optionId) {
    if (answered) return;
    setSelectedOption(optionId);
    setAnswered(true);
    setTotalAnswered((p) => p + 1);

    const correct = optionId === currentQuestion.correct_option_id;
    if (correct) setCorrectCount((p) => p + 1);

    const result = await submitQuiz(currentQuestion.question_id, optionId);
    if (result) {
      setLastReward({ xp: result.xp_earned || 0, fp: result.fp_earned || 0 });
    } else {
      setLastReward(null);
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setAnswered(false);
    setCurrentIndex((prev) => (prev + 1) % questionsWithOptions.length);
  }

  const hasQuizData = questionsWithOptions.length > 0;

  return (
    <section className="rpg-panel-dark p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--gold)]" />
          <h2 className="font-medieval text-lg font-semibold text-[var(--text-gold)]">Bilgi Merkezi</h2>
        </div>
        {totalAnswered > 0 && (
          <span className="rpg-badge">
            {correctCount}/{totalAnswered} doğru
          </span>
        )}
      </div>

      {/* Öğrenme İçerikleri */}
      {learningContents.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-[#8b7355]">Öğrenme İçerikleri</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {learningContents.slice(0, 6).map((item) => {
              const id = item.content_id || item.id;
              const isExpanded = expandedContent === id;
              return (
                <li
                  key={id}
                  className="cursor-pointer rounded-md border border-[var(--border-wood)]/30 bg-[#2a1f0e] p-3 transition-all hover:border-[var(--gold)]/40"
                  onClick={() => setExpandedContent(isExpanded ? null : id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-light)]">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {item.module_title && (
                          <span className="text-[10px] text-[var(--gold)]">{item.module_title}</span>
                        )}
                        <span className="text-xs text-[#8b7355]">{item.content_type || 'content'}</span>
                        {item.estimated_time_min && (
                          <span className="text-[10px] text-[#8b7355]">{item.estimated_time_min} dk</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-[#8b7355] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {isExpanded && item.body_text && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 border-t border-[var(--border-wood)]/20 pt-2 text-xs leading-relaxed text-[var(--text-light)] opacity-70">
                          {item.body_text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Quiz */}
      {hasQuizData ? (
        <div className="rounded-lg border border-[var(--border-wood)]/30 bg-[#1e1608] p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--gold)]">
              Soru {currentIndex + 1} / {questionsWithOptions.length}
            </span>
            <span className="rpg-badge">
              +{currentQuestion?.xp || 10} XP
            </span>
          </div>

          <p className="mb-3 text-sm font-semibold text-[var(--text-light)]">
            {currentQuestion?.question_text}
          </p>

          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {currentQuestion?.options.map((opt) => {
                const isSelected = selectedOption === opt.option_id;
                const isCorrectOpt = opt.option_id === currentQuestion.correct_option_id;
                let optClass = 'border-[var(--border-wood)]/20 bg-[#2a1f0e] text-[var(--text-light)] hover:border-[var(--gold)]/40';
                if (answered && isCorrectOpt)
                  optClass = 'border-emerald-600 bg-emerald-900/30 text-emerald-300';
                else if (answered && isSelected && !isCorrectOpt)
                  optClass = 'border-rose-600 bg-rose-900/30 text-rose-300';

                return (
                  <motion.button
                    key={opt.option_id}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.99 } : {}}
                    disabled={answered}
                    onClick={() => handleAnswer(opt.option_id)}
                    className={`flex w-full items-center gap-2 rounded-md border p-3 text-left text-sm transition-all ${optClass} ${
                      answered ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {answered && isCorrectOpt && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    )}
                    {answered && isSelected && !isCorrectOpt && (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <span>{opt.option_text}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 rounded-md p-3 text-sm ${
                  isCorrect
                    ? 'border border-emerald-700/40 bg-emerald-900/30 text-emerald-300'
                    : 'border border-rose-700/40 bg-rose-900/30 text-rose-300'
                }`}
              >
                <p className="font-medium">
                  {isCorrect ? currentQuestion.feedback_correct : currentQuestion.feedback_wrong}
                </p>
                {isCorrect && lastReward && (lastReward.xp > 0 || lastReward.fp > 0) && (
                  <p className="mt-1 text-xs font-semibold text-[var(--gold-light)]">
                    +{lastReward.xp} XP, +{lastReward.fp} FP kazandın!
                  </p>
                )}
                {isCorrect && lastReward && lastReward.xp === 0 && lastReward.fp === 0 && (
                  <p className="mt-1 text-xs text-emerald-400/70">
                    Bu soruyu zaten doğru cevaplamıştın, tekrar ödül yok.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {answered && (
            <button onClick={handleNext} className="rpg-btn mt-3 flex items-center gap-1 text-sm">
              Sonraki Soru <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-[#8b7355]">
          Quiz verileri yükleniyor...
        </p>
      )}

      {/* Golden Tower */}
      {towerUnlocked ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 flex items-center gap-2 rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-2"
        >
          <Trophy className="h-5 w-5 text-[var(--gold)]" />
          <p className="font-medieval text-sm font-semibold text-[var(--text-gold)]">
            Level 5! Golden AgeSA Tower mağazada açıldı!
          </p>
        </motion.div>
      ) : (
        <p className="mt-4 text-xs text-[#8b7355]">
          Level 5'e ulaşınca Golden AgeSA Tower açılacak.
        </p>
      )}
    </section>
  );
}
