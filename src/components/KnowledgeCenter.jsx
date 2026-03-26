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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-900">Bilgi Merkezi</h2>
        </div>
        {totalAnswered > 0 && (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {correctCount}/{totalAnswered} doğru
          </span>
        )}
      </div>

      {/* Öğrenme İçerikleri */}
      {learningContents.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-slate-600">Öğrenme İçerikleri</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {learningContents.slice(0, 6).map((item) => {
              const id = item.content_id || item.id;
              const isExpanded = expandedContent === id;
              return (
                <li
                  key={id}
                  className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
                  onClick={() => setExpandedContent(isExpanded ? null : id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {item.module_title && (
                          <span className="text-[10px] text-indigo-500">{item.module_title}</span>
                        )}
                        <span className="text-xs text-slate-500">{item.content_type || 'content'}</span>
                        {item.estimated_time_min && (
                          <span className="text-[10px] text-slate-400">{item.estimated_time_min} dk</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {isExpanded && item.body_text && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-600">
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
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-600">
              Soru {currentIndex + 1} / {questionsWithOptions.length}
            </span>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
              +{currentQuestion?.xp || 10} XP
            </span>
          </div>

          <p className="mb-3 text-sm font-semibold text-slate-800">
            {currentQuestion?.question_text}
          </p>

          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {currentQuestion?.options.map((opt) => {
                const isSelected = selectedOption === opt.option_id;
                const isCorrectOpt = opt.option_id === currentQuestion.correct_option_id;
                let optClass =
                  'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50';
                if (answered && isCorrectOpt)
                  optClass = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                else if (answered && isSelected && !isCorrectOpt)
                  optClass = 'border-rose-400 bg-rose-50 text-rose-800';

                return (
                  <motion.button
                    key={opt.option_id}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.99 } : {}}
                    disabled={answered}
                    onClick={() => handleAnswer(opt.option_id)}
                    className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${optClass} ${
                      answered ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {answered && isCorrectOpt && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    {answered && isSelected && !isCorrectOpt && (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
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
                className={`mt-3 rounded-lg p-3 text-sm ${
                  isCorrect
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <p className="font-medium">
                  {isCorrect ? currentQuestion.feedback_correct : currentQuestion.feedback_wrong}
                </p>
                {isCorrect && lastReward && (lastReward.xp > 0 || lastReward.fp > 0) && (
                  <p className="mt-1 text-xs font-semibold">
                    +{lastReward.xp} XP, +{lastReward.fp} FP kazandın!
                  </p>
                )}
                {isCorrect && lastReward && lastReward.xp === 0 && lastReward.fp === 0 && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Bu soruyu zaten doğru cevaplamıştın, tekrar ödül yok.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {answered && (
            <button
              onClick={handleNext}
              className="mt-3 flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sonraki Soru <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-slate-400">
          Quiz verileri yükleniyor...
        </p>
      )}

      {/* Golden Tower */}
      {towerUnlocked ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2"
        >
          <Trophy className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            Level 5! Golden AgeSA Tower mağazada açıldı!
          </p>
        </motion.div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          Level 5'e ulaşınca Golden AgeSA Tower açılacak.
        </p>
      )}
    </section>
  );
}
