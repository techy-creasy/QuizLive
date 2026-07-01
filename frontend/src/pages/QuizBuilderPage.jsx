import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { quizAPI } from '../services/api';
import { Button, Input, Card, Select, Badge } from '../components/ui';

const QUESTION_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True / False' },
  { value: 'poll', label: 'Poll (no correct answer)' },
];

const defaultQuestion = {
  question: '',
  type: 'multiple-choice',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  correctAnswer: 0,
  timer: 30,
  points: 100,
};

const QuestionCard = ({ index, question, register, control, watch, setValue, remove }) => {
  const questionType = watch(`questions.${index}.type`);
  const correctAnswer = watch(`questions.${index}.correctAnswer`);

  const isTrueFalse = questionType === 'true-false';
  const isPoll = questionType === 'poll';

  const { fields: optionFields } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  });

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setValue(`questions.${index}.type`, type);
    if (type === 'true-false') {
      setValue(`questions.${index}.options`, [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false },
      ]);
      setValue(`questions.${index}.correctAnswer`, 0);
    } else if (type === 'multiple-choice') {
      setValue(`questions.${index}.options`, defaultQuestion.options);
    }
  };

  const OPTION_COLORS = ['bg-blue-500', 'bg-pink-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];

  return (
    <div className="card p-6 relative">
      {/* Question header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-bold text-primary-400">
            {index + 1}
          </div>
          <select
            className="input-field !w-auto !py-1.5 text-sm"
            {...register(`questions.${index}.type`)}
            onChange={handleTypeChange}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <Button variant="danger" size="sm" onClick={() => remove(index)} type="button">
          Remove
        </Button>
      </div>

      {/* Question text */}
      <Input
        label="Question"
        placeholder="Type your question here..."
        className="mb-5"
        {...register(`questions.${index}.question`, { required: 'Question text is required' })}
      />

      {/* Options */}
      <div className="mb-5">
        <label className="label">Answer Options</label>
        <div className="space-y-2">
          {optionFields.map((field, optIdx) => (
            <div key={field.id} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${OPTION_COLORS[optIdx % OPTION_COLORS.length]}`} />
              <input
                className={`input-field flex-1 ${!isTrueFalse ? '' : '!bg-slate-700/30 !cursor-default'}`}
                placeholder={`Option ${optIdx + 1}`}
                readOnly={isTrueFalse}
                {...register(`questions.${index}.options.${optIdx}.text`, {
                  required: 'Option text required',
                })}
              />
              {!isPoll && (
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    value={optIdx}
                    checked={Number(correctAnswer) === optIdx}
                    onChange={() => setValue(`questions.${index}.correctAnswer`, optIdx)}
                    className="text-green-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">Correct</span>
                </label>
              )}
            </div>
          ))}
        </div>
        {!isTrueFalse && !isPoll && optionFields.length < 6 && (
          <button
            type="button"
            className="mt-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            onClick={() => {
              const current = watch(`questions.${index}.options`) || [];
              setValue(`questions.${index}.options`, [...current, { text: '', isCorrect: false }]);
            }}
          >
            + Add option
          </button>
        )}
      </div>

      {/* Timer and Points */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Timer"
          {...register(`questions.${index}.timer`, { valueAsNumber: true })}
          options={[
            { value: 5, label: '5 seconds' },
            { value: 10, label: '10 seconds' },
            { value: 15, label: '15 seconds' },
            { value: 20, label: '20 seconds' },
            { value: 30, label: '30 seconds' },
            { value: 45, label: '45 seconds' },
            { value: 60, label: '60 seconds' },
            { value: 90, label: '90 seconds' },
            { value: 120, label: '120 seconds' },
          ]}
        />
        <Select
          label="Points"
          {...register(`questions.${index}.points`, { valueAsNumber: true })}
          options={[
            { value: 0, label: 'No points' },
            { value: 50, label: '50 points' },
            { value: 100, label: '100 points' },
            { value: 150, label: '150 points' },
            { value: 200, label: '200 points' },
            { value: 500, label: '500 points' },
            { value: 1000, label: '1000 points' },
          ]}
        />
      </div>
    </div>
  );
};

const QuizBuilderPage = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      randomizeQuestions: false,
      randomizeOptions: false,
      questions: [{ ...defaultQuestion }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  useEffect(() => {
    if (isEdit) {
      quizAPI.getById(id).then(res => {
        const quiz = res.data.quiz;
        reset({
          title: quiz.title,
          description: quiz.description || '',
          randomizeQuestions: quiz.randomizeQuestions,
          randomizeOptions: quiz.randomizeOptions,
          questions: quiz.questions.map(q => ({
            question: q.question,
            type: q.type,
            options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
            correctAnswer: q.correctAnswer ?? 0,
            timer: q.timer,
            points: q.points,
          })),
        });
      }).catch(() => toast.error('Failed to load quiz'));
    }
  }, [id]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEdit) {
        await quizAPI.update(id, data);
        toast.success('Quiz updated!');
      } else {
        const res = await quizAPI.create(data);
        toast.success('Quiz created!');
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save quiz';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{isEdit ? 'Edit Quiz' : 'Create Quiz'}</h1>
          <p className="text-slate-400 mt-1">{fields.length} question{fields.length !== 1 ? 's' : ''} added</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)} type="button">
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit(onSubmit)} type="button">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Quiz'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quiz details */}
        <Card>
          <h2 className="font-display font-semibold text-lg mb-4">Quiz Details</h2>
          <div className="space-y-4">
            <Input
              label="Quiz title"
              placeholder="e.g. World Geography Challenge"
              error={errors.title?.message}
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Title must be at least 3 characters' },
              })}
            />
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="A brief description of this quiz..."
                {...register('description')}
              />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" {...register('randomizeQuestions')} />
                <span className="text-sm text-slate-300">Randomize question order</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" {...register('randomizeOptions')} />
                <span className="text-sm text-slate-300">Randomize option order</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {fields.map((field, index) => (
            <QuestionCard
              key={field.id}
              index={index}
              question={field}
              register={register}
              control={control}
              watch={watch}
              setValue={setValue}
              remove={remove}
            />
          ))}
        </div>

        {/* Add question */}
        <button
          type="button"
          onClick={() => append({ ...defaultQuestion })}
          className="w-full py-4 border-2 border-dashed border-slate-600 hover:border-primary-500 rounded-2xl text-slate-400 hover:text-primary-400 transition-all font-medium"
        >
          + Add Question
        </button>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => navigate(-1)} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={saving} size="lg">
            {isEdit ? 'Save Changes' : 'Create Quiz'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default QuizBuilderPage;
