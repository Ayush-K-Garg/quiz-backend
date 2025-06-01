const axios = require('axios');

const categoryMap = {
  'General Knowledge': 9,
  'Science': 17,
  'Mathematics': 19,
  'History': 23,
  'Geography': 22,
  'Sports': 21,
  'Politics': 24,
  'Music': 12,
  'Art': 25,
  'Technology': 18,
  'Books': 10,
  'Movies': 11,
  'Computer Science': 18,
  'Nature': 17,
};

exports.getQuizQuestions = async (req, res) => {
  let { category, difficulty, amount } = req.query; // Use let instead of const

  // Convert category name to ID
  if (category && categoryMap[category]) {
    category = categoryMap[category];
  } else if (category) {
    return res.status(400).json({ message: 'Invalid category selected' });
  }

  const params = new URLSearchParams();
  params.append('amount', amount || '10'); // default if not provided
  if (category) params.append('category', category);
  if (difficulty) params.append('difficulty', difficulty);
  params.append('type', 'multiple');

  try {
    const response = await axios.get(`https://opentdb.com/api.php?${params.toString()}`);
    if (response.data.response_code !== 0) {
      return res.status(400).json({ message: 'Failed to fetch questions' });
    }

    const questions = response.data.results.map(q => ({
      question: q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      all_answers: shuffle([q.correct_answer, ...q.incorrect_answers]),
      category: q.category,
      difficulty: q.difficulty,
    }));

    res.json(questions);
  } catch (error) {
    console.error('Error fetching quiz questions:', error.message);
    res.status(500).json({ message: 'Server error while fetching quiz questions' });
  }
};

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}
