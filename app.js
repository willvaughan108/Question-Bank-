/**
 * MQ-4C NFO Question Bank Quiz (vanilla JS)
 *
 * How to prepare your data:
 * 1) In Access, export the question table to a JSON file (preferred) OR a CSV file
 *    containing the fields: id, question, choice_a, choice_b, choice_c, choice_d,
 *    correct_choice, category, difficulty, reference, fillInBlank flag. (Choices/correct are optional.)
 * 2) Optionally export an answer sheet CSV with fields: QuestionID, Answer, blnCorrect.
 * 3) Save the files locally (no server needed). Open index.html in a browser, choose
 *    the question file (JSON/CSV) and optional answer CSV, then click "Load Questions".
 *
 * All data stays in memory; nothing is sent over the network or stored.
 * NOTE: The app now loads embedded CSV data from embeddedData.js at startup (no upload needed).
 */
const QuizApp = (() => {
  const state = {
    allQuestions: [],
    filteredQuestions: [],
    currentIndex: 0,
    answers: {}, // keyed by question id -> { selectedChoices, selectedChoice, fillText, isCorrect, manualCorrect, revealed }
    filters: {
      category: 'all',
      shuffle: false,
    },
    testMode: {
      bookMode: null, // null | open | closed
      category: 'all',
      shuffle: false,
      genMode: 'manual',
      questionCount: null,
      distribution: 'random', // random | even
    },
    currentMode: null, // null | 'study' | 'test'
    manualSelection: new Set(),
    sessionBaseQuestions: [],
    reviewMode: false,
  };

  const elements = {};

  const init = () => {
    cacheElements();
    wireEvents();
    loadEmbeddedBank();
  };

  const cacheElements = () => {
    elements.appHeader = document.getElementById('appHeader');
    elements.totalCount = document.getElementById('totalCount');
    elements.progressText = document.getElementById('progressText');
    elements.errorBanner = document.getElementById('errorBanner');

    elements.loadScreen = document.getElementById('loadScreen');
    elements.modeScreen = document.getElementById('modeScreen');
    elements.quizScreen = document.getElementById('quizScreen');
    elements.fileInput = document.getElementById('fileInput');
    elements.answerFileInput = document.getElementById('answerFileInput');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.backToFilesBtn = document.getElementById('backToFilesBtn');
    elements.studyModeBtn = document.getElementById('studyModeBtn');
    elements.testModeBtn = document.getElementById('testModeBtn');

    elements.categoryFilter = document.getElementById('categoryFilter');
    elements.studyBookSelect = document.getElementById('studyBookSelect');
    elements.shuffleToggle = document.getElementById('shuffleToggle');
    elements.applyFiltersBtn = document.getElementById('applyFiltersBtn');
    elements.resetFiltersBtn = document.getElementById('resetFiltersBtn');
    elements.toModeFromStudy = document.getElementById('toModeFromStudy');
    elements.studyControls = document.getElementById('studyControls');
    elements.testControls = document.getElementById('testControls');

    elements.bookModeRadios = Array.from(document.querySelectorAll('input[name="bookMode"]'));
    elements.genModeRadios = Array.from(document.querySelectorAll('input[name="genMode"]'));
    elements.testCategorySelect = document.getElementById('testCategorySelect');
    elements.testShuffleToggle = document.getElementById('testShuffleToggle');
    elements.generateTestBtn = document.getElementById('generateTestBtn');
    elements.generateListBtn = document.getElementById('generateListBtn');
    elements.resetTestBtn = document.getElementById('resetTestBtn');
    elements.toModeFromTest = document.getElementById('toModeFromTest');
    elements.questionCountInput = document.getElementById('questionCountInput');
    elements.distributionSelect = document.getElementById('distributionSelect');
    elements.autoGroups = Array.from(document.querySelectorAll('.auto-group'));
    elements.manualPanel = document.getElementById('manualTestPanel');
    elements.manualList = document.getElementById('manualList');
    elements.manualCategorySelect = document.getElementById('manualCategorySelect');
    elements.selectAllManual = document.getElementById('selectAllManual');
    elements.clearManual = document.getElementById('clearManual');
    elements.manualSelectionCount = document.getElementById('manualSelectionCount');
    elements.questionListPanel = document.getElementById('questionListPanel');
    elements.questionList = document.getElementById('questionList');
    elements.questionListCount = document.getElementById('questionListCount');
    elements.testTypePrompt = document.getElementById('testTypePrompt');
    elements.chooseOpenBtn = document.getElementById('chooseOpenBtn');
    elements.chooseClosedBtn = document.getElementById('chooseClosedBtn');

    elements.summaryBar = document.getElementById('summaryBar');
    elements.answeredCount = document.getElementById('answeredCount');
    elements.correctCount = document.getElementById('correctCount');
    elements.accuracyStat = document.getElementById('accuracyStat');

    elements.questionCategory = document.getElementById('questionCategory');
    elements.questionDifficulty = document.getElementById('questionDifficulty');
    elements.questionText = document.getElementById('questionText');
    elements.choiceAText = document.getElementById('choiceAText');
    elements.choiceBText = document.getElementById('choiceBText');
    elements.choiceCText = document.getElementById('choiceCText');
    elements.choiceDText = document.getElementById('choiceDText');
    elements.choiceEText = document.getElementById('choiceEText');
    elements.choicesForm = document.getElementById('choicesForm');
    elements.fillContainer = document.getElementById('fillContainer');
    elements.fillInput = document.getElementById('fillInput');
    elements.answerReveal = document.getElementById('answerReveal');
    elements.resultText = document.getElementById('resultText');
    elements.userAnswerText = document.getElementById('userAnswerText');
    elements.answerText = document.getElementById('answerText');
    elements.referenceText = document.getElementById('referenceText');
    elements.markCorrectBtn = document.getElementById('markCorrectBtn');
    elements.sessionSummary = document.getElementById('sessionSummary');
    elements.summaryPercent = document.getElementById('summaryPercent');
    elements.summaryDetails = document.getElementById('summaryDetails');
    elements.startOverBtn = document.getElementById('startOverBtn');
    elements.reviewMissedBtn = document.getElementById('reviewMissedBtn');

    elements.submitAnswerBtn = document.getElementById('submitAnswerBtn');
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
    elements.skipToSummaryBtn = document.getElementById('skipToSummaryBtn');
    elements.actions = document.querySelector('.actions');
  };

  const wireEvents = () => {
    if (elements.fileInput) elements.fileInput.addEventListener('change', handleFileSelected);
    if (elements.answerFileInput) elements.answerFileInput.addEventListener('change', clearError);
    if (elements.loadBtn) elements.loadBtn.addEventListener('click', handleLoadClick);
    if (elements.backToFilesBtn) elements.backToFilesBtn.addEventListener('click', renderLoadState);
    elements.studyModeBtn.addEventListener('click', enterStudyMode);
    elements.testModeBtn.addEventListener('click', enterTestMode);

    elements.applyFiltersBtn.addEventListener('click', () => applyFilters());
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    elements.shuffleToggle.addEventListener('change', () => {
      // Shuffle is applied when Apply Filters is clicked; checkbox just stores intent.
    });
    elements.studyBookSelect.addEventListener('change', () => {
      state.filters.bookMode = elements.studyBookSelect.value;
    });
    elements.toModeFromStudy.addEventListener('click', showModeSelection);

    elements.bookModeRadios.forEach((r) =>
      r.addEventListener('change', (e) => {
        handleTestTypeSelection(e.target.value);
      }),
    );
    elements.genModeRadios.forEach((r) =>
      r.addEventListener('change', (e) => {
        state.testMode.genMode = e.target.value;
        updateGenerationModeUI();
      }),
    );
    elements.testShuffleToggle.addEventListener('change', (e) => {
      state.testMode.shuffle = e.target.checked;
    });
    elements.testCategorySelect.addEventListener('change', (e) => {
      state.testMode.category = e.target.value;
      renderManualList();
      updateDistributionAvailability();
      updateQuestionCountHint();
      updateGenerateTestAvailability();
    });
    elements.questionCountInput.addEventListener('change', () => {
      state.testMode.questionCount = parseQuestionCount();
      updateGenerateTestAvailability();
    });
    elements.distributionSelect.addEventListener('change', (e) => {
      state.testMode.distribution = e.target.value;
      updateDistributionAvailability();
    });
    elements.manualCategorySelect.addEventListener('change', renderManualList);
    elements.chooseOpenBtn.addEventListener('click', () => handleTestTypeSelection('open'));
    elements.chooseClosedBtn.addEventListener('click', () => handleTestTypeSelection('closed'));
    elements.selectAllManual.addEventListener('click', selectAllManualVisible);
    elements.clearManual.addEventListener('click', clearManualSelection);
    elements.generateTestBtn.addEventListener('click', generateTest);
    elements.generateListBtn.addEventListener('click', generateQuestionList);
    elements.resetTestBtn.addEventListener('click', () => {
      state.testMode = {
        bookMode: null,
        category: 'all',
        shuffle: false,
        genMode: 'manual',
        questionCount: null,
        distribution: 'random',
      };
      state.manualSelection = new Set();
      elements.bookModeRadios.forEach((r) => (r.checked = false));
      elements.genModeRadios.forEach((r) => (r.checked = r.value === 'manual'));
      elements.testCategorySelect.value = 'all';
      elements.testShuffleToggle.checked = false;
      elements.manualCategorySelect.value = 'all';
      if (elements.questionCountInput) elements.questionCountInput.value = '';
      if (elements.distributionSelect) elements.distributionSelect.value = 'random';
      showTestTypePrompt();
      updateGenerationModeUI();
      renderManualList();
      resetFilters();
    });
    elements.toModeFromTest.addEventListener('click', showModeSelection);

    elements.prevBtn.addEventListener('click', goToPreviousQuestion);
    elements.nextBtn.addEventListener('click', goToNextQuestion);
    elements.submitAnswerBtn.addEventListener('click', submitAnswer);
    elements.skipToSummaryBtn?.addEventListener('click', showSessionSummary);
    elements.choicesForm.addEventListener('change', handleAnswerChange);
    elements.fillInput.addEventListener('input', handleFillInput);
    elements.markCorrectBtn?.addEventListener('click', toggleManualCredit);
    elements.startOverBtn?.addEventListener('click', startOverSession);
    elements.reviewMissedBtn?.addEventListener('click', reviewMissedQuestions);
  };

  const renderLoadState = () => {
    elements.quizScreen?.classList.add('hidden');
    elements.modeScreen?.classList.remove('hidden');
    elements.appHeader?.classList.add('hidden');
    elements.loadScreen?.classList.add('hidden');
    clearError();
  };

  const handleFileSelected = () => {
    elements.loadBtn.disabled = !elements.fileInput.files || !elements.fileInput.files.length;
    clearError();
  };

  const handleLoadClick = () => {
    const file = elements.fileInput.files && elements.fileInput.files[0];
    if (!file) return;
    const answerFile = elements.answerFileInput.files && elements.answerFileInput.files[0];

    Promise.all([readFileAsText(file), answerFile ? readFileAsText(answerFile) : Promise.resolve(null)])
      .then(([questionText, answerText]) => {
        const questions = parseQuestionBank(file.name, questionText);
        if (!questions.length) {
          showError('The question bank is empty. Please export the Access table to JSON or CSV again.');
          return;
        }
        const answers = answerText ? parseAnswerCsv(answerText) : [];
        const mergedQuestions = mergeAnswersIntoQuestions(questions, answers);

        state.allQuestions = mergedQuestions;
        state.filteredQuestions = [...mergedQuestions];
        state.currentIndex = 0;
        state.answers = {};
        populateFilterOptions();
        elements.loadScreen.classList.add('hidden');
        showModeSelection();
      })
      .catch((err) => {
        console.error(err);
        showError('Could not read question/answer files. Check that these are valid JSON/CSV exports from Access.');
      });
  };

  const loadEmbeddedBank = () => {
    try {
      const questionText = (window.EMBEDDED_QUESTION_CSV || '').trim();
      const answerText = (window.EMBEDDED_ANSWER_CSV || '').trim();
      if (!questionText) {
        showError('Embedded question data is missing.');
        return;
      }
      const questions = parseQuestionBank('embedded.csv', questionText);
      if (!questions.length) {
        showError('The embedded question bank is empty.');
        return;
      }
      const answers = answerText ? parseAnswerCsv(answerText) : [];
      const mergedQuestions = mergeAnswersIntoQuestions(questions, answers);

      state.allQuestions = mergedQuestions;
      state.filteredQuestions = [...mergedQuestions];
      state.sessionBaseQuestions = [...mergedQuestions];
      state.currentIndex = 0;
      state.answers = {};
      state.reviewMode = false;
      populateFilterOptions();
      elements.loadScreen?.classList.add('hidden');
      showModeSelection();
    } catch (err) {
      console.error(err);
      showError('Failed to load embedded question data.');
    }
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

  const parseQuestionBank = (fileName, text) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) {
      return parseQuestionBankCsv(text);
    }
    return parseQuestionBankJson(text);
  };

  const parseQuestionBankJson = (jsonText) => {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error('Question bank JSON must be an array.');
    }
    return parsed.map((item, index) => normalizeQuestion(item, index));
  };

  const parseQuestionBankCsv = (csvText) => {
    const delimiter = detectDelimiter(csvText);
    const rows = parseCsvText(csvText, delimiter);
    if (!rows.length) return [];

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const normalizedHeaders = headerRow.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const headerMap = {};
    normalizedHeaders.forEach((name, idx) => {
      headerMap[name] = idx;
    });

    const pickByAliases = (row, aliases) => {
      for (const key of aliases) {
        if (key in headerMap) {
          const val = row[headerMap[key]];
          return typeof val === 'string' ? val.trim() : val;
        }
      }
      return undefined;
    };

    const idAliases = ['id', 'questionid', 'qid'];
    const questionAliases = ['question', 'strquestion', 'prompt', 'text'];
    const choiceAAliases = ['choicea', 'choice_a', 'a', 'answera'];
    const choiceBAliases = ['choiceb', 'choice_b', 'b', 'answerb'];
    const choiceCAliases = ['choicec', 'choice_c', 'c', 'answerc'];
    const choiceDAliases = ['choiced', 'choice_d', 'd', 'answerd'];
    const choiceEAliases = ['choicee', 'choice_e', 'e', 'answere'];
    const correctAliases = ['correctchoice', 'correct', 'answer', 'correctanswer'];
    const categoryAliases = ['system', 'subcategory', 'sub', 'subcat', 'category', 'categoryid'];
    const difficultyAliases = ['difficulty', 'level'];
    const referenceAliases = ['reference', 'ref', 'chapter', 'page', 'remarks'];
    const fillBlankAliases = ['fillinblankquestion', 'fillinblank', 'fill', 'fillblank', 'fillin'];
    const openBookAliases = ['blnopen', 'openbook', 'open'];

    const mapped = dataRows
      .filter((r) => r.some((cell) => cell && cell.trim() !== ''))
      .map((row, index) => ({
        id: pickByAliases(row, idAliases),
        question: pickByAliases(row, questionAliases),
        choice_a: pickByAliases(row, choiceAAliases),
        choice_b: pickByAliases(row, choiceBAliases),
        choice_c: pickByAliases(row, choiceCAliases),
        choice_d: pickByAliases(row, choiceDAliases),
        choice_e: pickByAliases(row, choiceEAliases),
        correct_choice: pickByAliases(row, correctAliases),
        category: pickByAliases(row, categoryAliases),
        difficulty: pickByAliases(row, difficultyAliases),
        reference: pickByAliases(row, referenceAliases),
        fill_in_blank: pickByAliases(row, fillBlankAliases),
        open_book: pickByAliases(row, openBookAliases),
      }))
      .map((item, index) => normalizeQuestion(item, index));

    return mapped;
  };

  const detectDelimiter = (text) => {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    return semiCount > commaCount ? ';' : ',';
  };

  // Basic CSV parser that handles quoted fields and both \n / \r\n newlines.
  const parseCsvText = (text, delimiter) => {
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;
    const pushField = () => {
      current.push(field);
      field = '';
    };
    const pushRow = () => {
      rows.push(current);
      current = [];
    };

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        pushField();
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }
        pushField();
        pushRow();
      } else {
        field += char;
      }
    }
    pushField();
    if (current.length) pushRow();
    return rows;
  };

  const normalizeQuestion = (item, index) => {
    const fallbackId = `q-${index + 1}`;
    const toDisplay = (value, fallback) =>
      value === undefined || value === null || value === '' ? fallback : String(value);
    const normalizeText = (value, placeholder) => {
      if (value === undefined || value === null || value === '') return placeholder;
      // Replace newlines with spaces, then collapse multiple spaces.
      const str = String(value).replace(/\s+/g, ' ').trim();
      return str || placeholder;
    };
    const normalizeChoice = (value, placeholder) => {
      if (value === undefined || value === null || value === '') return placeholder;
      const str = String(value).replace(/\s+/g, ' ').trim();
      return str || placeholder;
    };
    const rawChoice = (value) => {
      if (value === undefined || value === null) return '';
      return String(value).replace(/\s+/g, ' ').trim();
    };

    const rawCorrect = (item.correct_choice || item.correctChoice || '').toString().trim().toUpperCase();
    const correctMatches = rawCorrect.match(/[A-E]/g) || [];
    const validCorrectChoices = Array.from(new Set(correctMatches.filter((letter) => ['A', 'B', 'C', 'D', 'E'].includes(letter))));
    const validCorrect = validCorrectChoices[0] || null;
    const fillRaw = item.fill_in_blank ?? item.fillInBlank ?? item.fill_blank ?? item.fill;
    const fillFlag = (fillRaw || '').toString().trim();
    const isFillBlank = fillFlag === '1' || fillFlag.toLowerCase() === 'true';
    const openRaw = item.open_book ?? item.blnOpen ?? item.open ?? item.is_open;
    const openFlag = (openRaw || '').toString().trim().toLowerCase();
    let isOpenBook = null;
    if (openFlag === '1' || openFlag === 'true') isOpenBook = true;
    if (openFlag === '0' || openFlag === 'false') isOpenBook = false;

    const candidateChoices = {
      A: rawChoice(item.choice_a),
      B: rawChoice(item.choice_b),
      C: rawChoice(item.choice_c),
      D: rawChoice(item.choice_d),
      E: rawChoice(item.choice_e ?? item.choiceE ?? item.choicee),
    };
    const tfValues = ['true', 'false'];
    const providedTf = Object.values(candidateChoices)
      .map((v) => v.toLowerCase())
      .filter((v) => v);
    const isTrueFalseCandidate =
      providedTf.length === 2 &&
      new Set(providedTf).size === 2 &&
      providedTf.every((v) => tfValues.includes(v));

    const normalizedChoices = {
      id: toDisplay(item.id, fallbackId),
      question: toDisplay(item.question, `Question ${index + 1}`),
      choices: {
        A: normalizeChoice(candidateChoices.A, 'Choice A not provided'),
        B: normalizeChoice(candidateChoices.B, 'Choice B not provided'),
        C: normalizeChoice(candidateChoices.C, 'Choice C not provided'),
        D: normalizeChoice(candidateChoices.D, 'Choice D not provided'),
        E: normalizeChoice(candidateChoices.E, ''),
      },
      correctChoice: validCorrect,
      correctChoices: validCorrectChoices,
      category: toDisplay(item.category, 'Uncategorized'),
      difficulty: toDisplay(item.difficulty, 'Unspecified'),
      reference: toDisplay(item.reference, ''),
      isFillBlank,
      fillAnswer: '',
      isOpenBook,
      isTrueFalse: isTrueFalseCandidate,
    };

    if (normalizedChoices.isTrueFalse) {
      normalizedChoices.choices.C = '';
      normalizedChoices.choices.D = '';
      normalizedChoices.choices.E = '';
    }

    return normalizedChoices;
  };

  const parseAnswerCsv = (csvText) => {
    const delimiter = detectDelimiter(csvText);
    const rows = parseCsvText(csvText, delimiter);
    if (!rows.length) return [];

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const normalizedHeaders = headerRow.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const headerMap = {};
    normalizedHeaders.forEach((name, idx) => {
      headerMap[name] = idx;
    });

    const pick = (row, aliases) => {
      for (const key of aliases) {
        if (key in headerMap) {
          const val = row[headerMap[key]];
          return typeof val === 'string' ? val.trim() : val;
        }
      }
      return undefined;
    };

    const qIdAliases = ['questionid', 'qid', 'id'];
    const answerTextAliases = ['answer', 'ans', 'text'];
    const correctAliases = ['blncorrect', 'iscorrect', 'correct', 'key'];

    return dataRows
      .filter((r) => r.some((cell) => cell && cell.trim() !== ''))
      .map((row) => {
        const rawCorrect = pick(row, correctAliases);
        const isCorrect = rawCorrect === '1' || rawCorrect === 1 || rawCorrect === true || rawCorrect === 'true';
        return {
          questionId: pick(row, qIdAliases),
          answerText: pick(row, answerTextAliases),
          isCorrect,
        };
      })
      .filter((item) => item.questionId !== undefined && item.answerText !== undefined);
  };

  const mergeAnswersIntoQuestions = (questions, answers) => {
    if (!answers.length) return questions;
    const answerMap = new Map();
    answers.forEach((ans) => {
      const key = ans.questionId !== undefined && ans.questionId !== null ? String(ans.questionId) : '';
      if (!key) return;
      if (!answerMap.has(key)) answerMap.set(key, []);
      answerMap.get(key).push(ans);
    });

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const normalizeAnswerText = (text) => {
      if (text === undefined || text === null) return '';
      return String(text).replace(/\s+/g, ' ').trim();
    };
    const isTrueFalseAnswers = (answers) => {
      const cleaned = answers
        .filter((ans) => ans && ans.answerText !== undefined && ans.answerText !== null)
        .map((ans) => ans.answerText.toString().trim().toLowerCase())
        .filter((text) => text);
      if (!cleaned.length) return false;
      const unique = new Set(cleaned);
      const allowed = new Set(['true', 'false']);
      return unique.size === 2 && cleaned.every((text) => allowed.has(text)) && allowed.has('true') && allowed.has('false');
    };

    return questions.map((q) => {
      const list = answerMap.get(q.id) || [];
      if (!list.length) return q;

      if (q.isFillBlank) {
        const corrects = list
          .filter((a) => a.isCorrect)
          .map((a) => normalizeAnswerText(a.answerText))
          .filter(Boolean);
        const fillAnswer = corrects.length
          ? corrects.join(' / ')
          : normalizeAnswerText(list[0]?.answerText || '');
        return {
          ...q,
          fillAnswer,
          correctChoice: null,
          correctChoices: [],
          choices: q.choices,
        };
      }

       const correctIndex = list.findIndex((a) => a.isCorrect);

      // Take first five; if the correct answer is beyond the first five, ensure it is included.
      let top = list.slice(0, 5);
      if (correctIndex >= 5) {
        top = [...top];
        top[top.length - 1] = list[correctIndex]; // replace last slot with correct answer
      }

      const updatedChoices = { ...q.choices };
      const derivedCorrectChoices = new Set(
        (q.correctChoices && q.correctChoices.length ? q.correctChoices : q.correctChoice ? [q.correctChoice] : []).map(
          (c) => c.toUpperCase(),
        ),
      );

      letters.forEach((letter, idx) => {
        const ans = top[idx];
        const normalizedText = ans && ans.answerText ? normalizeAnswerText(ans.answerText) : '';
        updatedChoices[letter] =
          normalizedText || q.choices[letter] || `Choice ${letter} not provided`;
        if (ans && ans.isCorrect) {
          derivedCorrectChoices.add(letter);
        }
      });

      const correctChoicesArray = Array.from(derivedCorrectChoices);
      const isTrueFalse = isTrueFalseAnswers(top);
      if (isTrueFalse) {
        updatedChoices.C = '';
        updatedChoices.D = '';
        updatedChoices.E = '';
      }

      return {
        ...q,
        choices: updatedChoices,
        correctChoice: correctChoicesArray[0] || null,
        correctChoices: correctChoicesArray,
        isTrueFalse: q.isTrueFalse || isTrueFalse,
      };
    });
  };

  const getCorrectChoices = (question) => {
    if (!question || question.isFillBlank) return [];
    if (Array.isArray(question.correctChoices) && question.correctChoices.length) {
      return question.correctChoices.map((c) => String(c).toUpperCase());
    }
    if (question.correctChoice) {
      return [String(question.correctChoice).toUpperCase()];
    }
    return [];
  };

  const isMultiSelectQuestion = (question) => getCorrectChoices(question).length > 1;

  const evaluateChoiceResponse = (question, selectedChoices) => {
    const correctChoices = getCorrectChoices(question);
    if (!correctChoices.length) return false;
    const selectedSet = new Set((selectedChoices || []).map((c) => String(c).toUpperCase()));
    const correctSet = new Set(correctChoices.map((c) => String(c).toUpperCase()));
    if (selectedSet.size !== correctSet.size) return false;
    for (const choice of correctSet) {
      if (!selectedSet.has(choice)) return false;
    }
    return true;
  };

  const evaluateFillResponse = (question, fillText) => {
    if (!question || !question.fillAnswer) return false;
    const submitted = (fillText || '').trim().toLowerCase();
    if (!submitted) return false;
    const answers = question.fillAnswer
      .split('/')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return answers.some((ans) => submitted === ans);
  };

  const toggleManualCredit = () => {
    const question = state.filteredQuestions[state.currentIndex];
    if (!question || !question.isFillBlank) return;
    const entry = state.answers[question.id];
    if (!entry || !entry.revealed) return;
    const fillText = entry.fillText || '';
    const autoCorrect = evaluateFillResponse(question, fillText);
    const manualCorrect = !(entry.manualCorrect === true);
    const updated = {
      ...entry,
      manualCorrect,
      isCorrect: manualCorrect ? true : autoCorrect,
    };
    state.answers[question.id] = updated;
    revealAnswer(question, updated);
    updateSummary();
  };

  const setSelectOptions = (select, options, label) => {
    if (!select) return;
    select.innerHTML = '';
    const sorted = Array.from(options || [])
      .filter((opt) => opt !== 'all')
      .sort((a, b) => (a > b ? 1 : -1));
    const ordered = ['all', ...sorted];
    ordered.forEach((opt) => {
      const optionEl = document.createElement('option');
      optionEl.value = opt;
      optionEl.textContent = opt === 'all' ? `All ${label}` : opt;
      select.appendChild(optionEl);
    });
    select.value = 'all';
  };

  const getCategoriesForBookMode = (bookMode) => {
    const categories = new Set(['all']);
    state.allQuestions.forEach((q) => {
      if (bookMode === 'open' && q.isOpenBook !== true) return;
      if (bookMode === 'closed' && q.isOpenBook !== false) return;
      categories.add(q.category || 'Uncategorized');
    });
    return categories;
  };

  const applyTestTypeCategories = (bookMode) => {
    const categories = getCategoriesForBookMode(bookMode);
    setSelectOptions(elements.testCategorySelect, categories, 'categories');
    setSelectOptions(elements.manualCategorySelect, categories, 'categories');
  };

  const updateManualSelectionCount = () => {
    if (!elements.manualSelectionCount) return;
    const count = state.manualSelection ? state.manualSelection.size : 0;
    elements.manualSelectionCount.textContent = `Selected: ${count}`;
  };

  const clearQuestionList = () => {
    if (elements.questionList) elements.questionList.innerHTML = '';
    if (elements.questionListPanel) elements.questionListPanel.classList.add('hidden');
    if (elements.questionListCount) elements.questionListCount.textContent = '0';
  };

  const setBookModeRadiosLocked = (locked) => {
    elements.bookModeRadios?.forEach((r) => {
      r.disabled = locked;
    });
  };

  const hasQuestionCount = () => {
    if (!elements.questionCountInput) return false;
    const raw = elements.questionCountInput.value;
    if (!raw || !String(raw).trim()) return false;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0;
  };

  const parseQuestionCount = (maxAvailable = null) => {
    if (!elements.questionCountInput) return null;
    const raw = elements.questionCountInput.value;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return maxAvailable !== null ? Math.min(parsed, maxAvailable) : parsed;
  };

  const updateDistributionAvailability = () => {
    if (!elements.distributionSelect) return;
    const categoryAll = (elements.testCategorySelect.value || 'all') === 'all';
    elements.distributionSelect.disabled = !categoryAll;
    if (!categoryAll) {
      elements.distributionSelect.value = 'random';
      state.testMode.distribution = 'random';
    }
  };

  const updateQuestionCountHint = () => {
    if (!elements.questionCountInput) return;
    const poolSize = getTestPool().length;
    elements.questionCountInput.max = poolSize || '';
    elements.questionCountInput.placeholder = poolSize ? `Up to ${poolSize}` : 'Use all available';
    if (!poolSize) {
      elements.questionCountInput.value = '';
      state.testMode.questionCount = null;
    }
    updateGenerateTestAvailability();
  };

  const updateGenerateTestAvailability = () => {
    const isAuto = state.testMode.genMode === 'auto';
    const needsCount = isAuto && !hasQuestionCount();
    elements.generateTestBtn.disabled = !!needsCount;
    if (elements.generateListBtn) elements.generateListBtn.disabled = !!needsCount;
  };

  const populateFilterOptions = () => {
    const categories = new Set(['all']);
    state.allQuestions.forEach((q) => {
      categories.add(q.category || 'Uncategorized');
    });

    setSelectOptions(elements.categoryFilter, categories, 'categories');
    applyTestTypeCategories(null);
    elements.shuffleToggle.checked = false;
    state.filters = { category: 'all', bookMode: 'all', shuffle: false };
    state.testMode = {
      bookMode: null,
      category: 'all',
      shuffle: false,
      genMode: 'manual',
      questionCount: null,
      distribution: 'random',
    };
    elements.bookModeRadios?.forEach((r) => (r.checked = false));
    elements.genModeRadios?.forEach((r) => (r.checked = r.value === 'manual'));
    elements.testShuffleToggle.checked = false;
    elements.testCategorySelect.value = 'all';
    elements.studyBookSelect.value = 'all';
    elements.manualCategorySelect.value = 'all';
    if (elements.questionCountInput) elements.questionCountInput.value = '';
    if (elements.distributionSelect) {
      elements.distributionSelect.value = 'random';
      elements.distributionSelect.disabled = false;
    }
    state.manualSelection = new Set();
    showTestTypePrompt();
    updateManualSelectionCount();
  };

  const applyFilters = () => {
    if (!state.allQuestions.length) return;

    state.filters = {
      category: elements.categoryFilter.value || 'all',
      bookMode: elements.studyBookSelect.value || 'all',
      shuffle: elements.shuffleToggle.checked,
    };

    let filtered = state.allQuestions.filter((q) => {
      const matchesCategory = state.filters.category === 'all' || q.category === state.filters.category;
      let matchesBook = true;
      if (state.filters.bookMode === 'open') matchesBook = q.isOpenBook === true;
      if (state.filters.bookMode === 'closed') matchesBook = q.isOpenBook === false;
      return matchesCategory && matchesBook;
    });

    if (state.filters.shuffle) {
      filtered = shuffleArray(filtered);
    }

    state.filteredQuestions = filtered;
    state.currentIndex = 0;
    state.sessionBaseQuestions = [...filtered];
    state.reviewMode = false;
    state.answers = {};
    hideSessionSummary();
    renderQuestion();
    updateSummary();
  };

  const resetFilters = () => {
    elements.categoryFilter.value = 'all';
    elements.shuffleToggle.checked = false;
    elements.studyBookSelect.value = 'all';
    state.filters = { category: 'all', bookMode: 'all', shuffle: false };
    state.filteredQuestions = state.allQuestions.length ? [...state.allQuestions] : [];
    state.sessionBaseQuestions = [...state.filteredQuestions];
    state.reviewMode = false;
    state.currentIndex = 0;
    state.answers = {};
    hideSessionSummary();
    renderQuestion();
    updateSummary();
  };

  const buildSelection = () => {
    if (!state.allQuestions.length) return null;
    if (state.testMode.genMode === 'auto' && !hasQuestionCount()) {
      showError('Enter the number of questions for auto generation.');
      updateGenerateTestAvailability();
      return null;
    }
    const bookMode = state.testMode.bookMode;
    if (!bookMode) {
      showError('Select Open or Closed book to generate a test.');
      showTestTypePrompt();
      return null;
    }
    const shuffle = state.testMode.shuffle;
    const genMode = state.testMode.genMode || 'manual';
    const base = getTestPool();
    if (!base.length) {
      showError('No questions match this book type/category selection.');
      return null;
    }

    let selected = [];
    if (genMode === 'manual') {
      const manual = base.filter((q) => state.manualSelection.has(q.id));
      if (!manual.length) {
        showError('No manual questions selected. Check boxes to include questions.');
        return null;
      }
      selected = shuffle ? shuffleArray(manual) : manual;
    } else {
      selected = buildAutoSelection(base);
      if (!selected.length) {
        showError('No questions available for auto generation with these settings.');
        return null;
      }
    }

    state.filteredQuestions = selected;
    state.currentIndex = 0;
    state.answers = {};
    renderQuestion();
    updateSummary();
    return selected;
  };

  const generateTest = () => {
    const selection = buildSelection();
    if (!selection) return;
    openPrintableTest(selection);
  };

  const generateQuestionList = () => {
    const selection = buildSelection();
    if (!selection) return;
    renderQuestionList(selection);
  };

  const renderManualList = () => {
    if (state.testMode.genMode !== 'manual' || !state.allQuestions.length || !state.testMode.bookMode) {
      elements.manualPanel.classList.add('hidden');
      return;
    }
    elements.manualPanel.classList.remove('hidden');
    const bookMode = state.testMode.bookMode;
    const category = elements.manualCategorySelect.value || 'all';
    const filtered = state.allQuestions.filter((q) => {
      const matchesCategory = category === 'all' || q.category === category;
      let matchesBook = true;
      if (bookMode === 'open') matchesBook = q.isOpenBook === true;
      if (bookMode === 'closed') matchesBook = q.isOpenBook === false;
      return matchesCategory && matchesBook;
    });

    elements.manualList.innerHTML = '';
    filtered.forEach((q) => {
      const row = document.createElement('div');
      row.className = 'manual-item';
      row.dataset.qid = q.id;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.manualSelection.has(q.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.manualSelection.add(q.id);
        else state.manualSelection.delete(q.id);
        updateManualSelectionCount();
      });
      const body = document.createElement('div');
      const title = document.createElement('div');
      title.textContent = q.question;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${q.category || 'Uncategorized'}${q.isOpenBook === true ? ' · Open' : q.isOpenBook === false ? ' · Closed' : ''}`;
      body.appendChild(title);
      body.appendChild(meta);
      row.appendChild(checkbox);
      row.appendChild(body);
      elements.manualList.appendChild(row);
    });
    updateManualSelectionCount();
  };

  const selectAllManualVisible = () => {
    elements.manualList.querySelectorAll('.manual-item').forEach((row) => {
      const cb = row.querySelector('input[type="checkbox"]');
      cb.checked = true;
      const idAttr = row.dataset.qid;
      if (idAttr) state.manualSelection.add(idAttr);
    });
    updateManualSelectionCount();
  };

  const clearManualSelection = () => {
    state.manualSelection = new Set();
    elements.manualList.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
    updateManualSelectionCount();
  };

  const openPrintableTest = (questions) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const printableChoices = (q) => {
      const letters = ['A', 'B', 'C', 'D', 'E'].filter((letter) => {
        if (q.isTrueFalse && (letter === 'C' || letter === 'D')) return false;
        if (q.isTrueFalse && letter === 'E') return false;
        const text = q.choices?.[letter];
        return text !== undefined && text !== null && String(text).trim() !== '';
      });
      return letters.map((letter) => `<li>${letter}) ${q.choices[letter]}</li>`).join('');
    };
    const html = `
      <html>
      <head>
        <title>Generated Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .q { margin-bottom: 18px; }
          .q h3 { margin: 0 0 6px; font-size: 16px; }
          .meta { color: #555; font-size: 12px; margin-bottom: 6px; }
          ul { margin: 4px 0 0 18px; padding: 0; }
          li { margin: 2px 0; }
        </style>
      </head>
      <body>
        <h1>Generated Test</h1>
        ${questions
          .map(
            (q, idx) => `
              <div class="q">
                <h3>${idx + 1}. ${q.question}</h3>
                <div class="meta">${q.category || 'Uncategorized'}${q.isOpenBook === true ? ' · Open' : q.isOpenBook === false ? ' · Closed' : ''}</div>
                ${
                  q.isFillBlank
                    ? '<p>______________________________</p>'
                    : `<ul>${printableChoices(q)}</ul>`
                }
              </div>
            `,
          )
          .join('')}
        <script>window.print();</script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const renderQuestionList = (questions) => {
    if (!elements.questionList || !elements.questionListPanel) return;
    if (!questions.length) {
      elements.questionList.innerHTML = '<div class="item-meta">No questions to show.</div>';
      elements.questionListCount.textContent = '0';
      elements.questionListPanel.classList.remove('hidden');
      return;
    }
    const html = questions
      .map((q, idx) => {
        const meta = `${q.category || 'Uncategorized'}${q.isOpenBook === true ? ' ? Open' : q.isOpenBook === false ? ' ? Closed' : ''}`;
        return `
          <div class="q-item">
            <div class="item-title">${idx + 1}. ${q.question}</div>
            <div class="item-meta">${meta}</div>
          </div>
        `;
      })
      .join('');
    elements.questionList.innerHTML = html;
    elements.questionListCount.textContent = String(questions.length);
    elements.questionListPanel.classList.remove('hidden');
  };

  const showTestTypePrompt = () => {
    state.testMode.bookMode = null;
    state.testMode.category = 'all';
    state.testMode.questionCount = null;
    state.testMode.distribution = 'random';
    state.manualSelection = new Set();
    elements.bookModeRadios.forEach((r) => (r.checked = false));
    setBookModeRadiosLocked(false);
    applyTestTypeCategories(null);
    if (elements.distributionSelect) elements.distributionSelect.value = 'random';
    updateDistributionAvailability();
    updateQuestionCountHint();
    if (elements.questionCountInput) elements.questionCountInput.value = '';
    elements.testTypePrompt.classList.remove('hidden');
    elements.testControls.classList.add('hidden');
    elements.manualPanel.classList.add('hidden');
    updateManualSelectionCount();
    clearQuestionList();
  };

  const handleTestTypeSelection = (type) => {
    state.testMode.bookMode = type;
    state.testMode.category = 'all';
    state.testMode.questionCount = parseQuestionCount();
    state.testMode.distribution = elements.distributionSelect?.value || 'random';
    state.manualSelection = new Set();
    elements.bookModeRadios.forEach((r) => (r.checked = r.value === type));
    setBookModeRadiosLocked(true);
    applyTestTypeCategories(type);
    elements.testCategorySelect.value = 'all';
    elements.manualCategorySelect.value = 'all';
    updateDistributionAvailability();
    updateQuestionCountHint();
    elements.testTypePrompt.classList.add('hidden');
    elements.testControls.classList.remove('hidden');
    updateGenerationModeUI();
    updateManualSelectionCount();
    clearQuestionList();
  };

  const updateGenerationModeUI = () => {
    const isAuto = state.testMode.genMode === 'auto';
    elements.autoGroups?.forEach((el) => el.classList.toggle('hidden', !isAuto));
    updateDistributionAvailability();
    updateQuestionCountHint();
    updateGenerateTestAvailability();
    if (elements.generateTestBtn) {
      elements.generateTestBtn.textContent = isAuto ? 'Generate Test PDF' : 'Generate Test';
    }
    renderManualList();
    if (state.currentMode === 'test') {
      renderQuestion();
    }
  };

  const showModeSelection = () => {
    state.currentMode = null;
    elements.appHeader.classList.add('hidden');
    elements.quizScreen.classList.add('hidden');
    elements.modeScreen.classList.remove('hidden');
  };

  const enterStudyMode = () => {
    state.currentMode = 'study';
    elements.modeScreen.classList.add('hidden');
    elements.quizScreen.classList.remove('hidden');
    elements.appHeader.classList.remove('hidden');
    elements.testTypePrompt.classList.add('hidden');
    elements.studyControls.classList.remove('hidden');
    elements.testControls.classList.add('hidden');
    applyFilters();
  };

  const enterTestMode = () => {
    state.currentMode = 'test';
    elements.modeScreen.classList.add('hidden');
    elements.quizScreen.classList.remove('hidden');
    elements.appHeader.classList.remove('hidden');
    elements.studyControls.classList.add('hidden');
    elements.testControls.classList.add('hidden');
    showTestTypePrompt();
    state.testMode.genMode = 'manual';
    state.testMode.questionCount = null;
    state.testMode.distribution = 'random';
    elements.genModeRadios.forEach((r) => (r.checked = r.value === 'manual'));
    if (elements.questionCountInput) elements.questionCountInput.value = '';
    if (elements.distributionSelect) elements.distributionSelect.value = 'random';
    state.filteredQuestions = [];
    state.currentIndex = 0;
    state.answers = {};
    updateGenerateTestAvailability();
    updateGenerationModeUI();
    renderQuestion();
    updateSummary();
    renderManualList();
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getTestPool = () => {
    if (!state.testMode.bookMode) return [];
    const bookMode = state.testMode.bookMode;
    const category = elements.testCategorySelect.value || 'all';
    return state.allQuestions.filter((q) => {
      const matchesCategory = category === 'all' || q.category === category;
      let matchesBook = true;
      if (bookMode === 'open') matchesBook = q.isOpenBook === true;
      if (bookMode === 'closed') matchesBook = q.isOpenBook === false;
      return matchesCategory && matchesBook;
    });
  };

  const pickEvenDistribution = (pool, desiredCount) => {
    const buckets = new Map();
    pool.forEach((q) => {
      const key = q.category || 'Uncategorized';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(q);
    });

    const bucketLists = Array.from(buckets.values()).map((list) => shuffleArray(list));
    const maxBuckets = bucketLists.length || 1;
    const selected = [];
    let idx = 0;

    while (selected.length < desiredCount && bucketLists.some((b) => b.length)) {
      const bucket = bucketLists[idx % maxBuckets];
      if (bucket.length) {
        selected.push(bucket.shift());
      }
      idx += 1;
    }

    return selected;
  };

  const buildAutoSelection = (pool) => {
    const category = elements.testCategorySelect.value || 'all';
    const maxAvailable = pool.length;
    const desiredCount = parseQuestionCount(maxAvailable) ?? maxAvailable;
    state.testMode.questionCount = desiredCount;
    if (!maxAvailable) return [];

    let selected = [];
    const evenMode = state.testMode.distribution === 'even' && category === 'all';
    if (evenMode) {
      selected = pickEvenDistribution(pool, desiredCount);
    } else {
      const base = state.testMode.shuffle ? shuffleArray(pool) : pool;
      selected = base.slice(0, desiredCount);
    }

    if (state.testMode.shuffle) {
      selected = shuffleArray(selected);
    }
    return selected;
  };

  const updateHeader = () => {
    const total = state.filteredQuestions.length;
    const current = total ? state.currentIndex + 1 : 0;
    elements.totalCount.textContent = `Total: ${total}`;
    elements.progressText.textContent = `Question ${current} of ${total}`;
  };

  const resetAnswerReveal = () => {
    elements.answerReveal.classList.add('hidden');
    elements.resultText.textContent = '';
    elements.resultText.classList.remove('correct', 'incorrect');
    elements.userAnswerText.textContent = '';
    elements.userAnswerText.classList.remove('correct', 'incorrect');
    elements.answerText.textContent = '';
    elements.answerText.classList.remove('correct', 'incorrect');
    elements.referenceText.textContent = '';
    elements.referenceText.classList.add('hidden');
    elements.markCorrectBtn?.classList.add('hidden');
    elements.choicesForm
      .querySelectorAll('.choice')
      .forEach((choice) => choice.classList.remove('correct', 'incorrect'));
  };

  const hideSessionSummary = () => {
    elements.sessionSummary?.classList.add('hidden');
    elements.questionCard?.classList.remove('hidden');
    elements.actions?.classList.remove('hidden');
    elements.summaryBar?.classList.remove('hidden');
  };

  const renderQuestion = () => {
    updateHeader();
    hideSessionSummary();

    if (state.currentMode === 'test') {
      renderTestModePlaceholder();
      return;
    }

    elements.summaryBar.classList.remove('hidden');
    elements.actions?.classList.remove('hidden');
    elements.prevBtn.classList.remove('hidden');
    elements.nextBtn.classList.add('hidden');
    elements.submitAnswerBtn.classList.remove('hidden');
    resetAnswerReveal();
    elements.fillInput.disabled = false;
    const question = state.filteredQuestions[state.currentIndex];

    if (!question) {
      elements.questionText.textContent =
        'No questions match these filters. Adjust the category/book filters or reset filters.';
      setChoiceText(['-', '-', '-', '-', '-']);
      setChoiceInputsDisabled(true);
      elements.answerReveal.classList.add('hidden');
      elements.questionCategory.textContent = 'Category';
      elements.questionDifficulty.textContent = 'Difficulty';
      elements.prevBtn.disabled = true;
      elements.nextBtn.disabled = true;
      elements.submitAnswerBtn.disabled = true;
      elements.submitAnswerBtn.classList.add('hidden');
      elements.nextBtn.classList.add('hidden');
      return;
    }

    const isFill = question.isFillBlank;
    const isMulti = isMultiSelectQuestion(question);
    if (isFill) {
      elements.fillContainer.classList.remove('hidden');
      elements.choicesForm.classList.add('hidden');
    } else {
      elements.fillContainer.classList.add('hidden');
      elements.choicesForm.classList.remove('hidden');
    }

    setChoiceInputType(isMulti ? 'checkbox' : 'radio');
    updateChoiceVisibility(question);
    setChoiceInputsDisabled(false);
    elements.questionText.textContent = question.question || 'Question text missing.';
    setChoiceText([
      question.choices.A ?? 'Choice A not provided',
      question.choices.B ?? 'Choice B not provided',
      question.choices.C ?? '',
      question.choices.D ?? '',
      question.choices.E ?? '',
    ]);

    elements.questionCategory.textContent = question.category || 'Uncategorized';
    elements.questionDifficulty.textContent = question.difficulty || 'Unspecified';

    const saved = state.answers[question.id] || {
      selectedChoice: null,
      selectedChoices: [],
      isCorrect: false,
      revealed: false,
      manualCorrect: false,
      fillText: '',
    };
    const savedChoices =
      saved.selectedChoices && saved.selectedChoices.length
        ? saved.selectedChoices
        : saved.selectedChoice
          ? [saved.selectedChoice]
          : [];
    setSelectedChoices(savedChoices);
    if (isFill) {
      elements.fillInput.value = saved.fillText || '';
    } else {
      elements.fillInput.value = '';
    }

    elements.prevBtn.disabled = state.currentIndex === 0;
    const isLast = state.currentIndex >= state.filteredQuestions.length - 1;
    elements.submitAnswerBtn.disabled = false;

    const isRevealed = !!saved.revealed;
    if (isRevealed) {
      elements.submitAnswerBtn.classList.add('hidden');
      elements.nextBtn.classList.remove('hidden');
      elements.nextBtn.disabled = isLast;
    } else {
      elements.submitAnswerBtn.classList.remove('hidden');
      elements.nextBtn.classList.add('hidden');
      elements.nextBtn.disabled = true;
    }

    if (saved.revealed) {
      revealAnswer(question, saved);
    } else {
      elements.answerReveal.classList.add('hidden');
    }
  };

  const renderTestModePlaceholder = () => {
    elements.summaryBar.classList.add('hidden');
    elements.actions?.classList.add('hidden');
    resetAnswerReveal();
    elements.fillContainer.classList.add('hidden');
    elements.choicesForm.classList.add('hidden');
    setChoiceInputsDisabled(true);
    elements.fillInput.value = '';
    elements.fillInput.disabled = true;
    elements.questionText.textContent = state.testMode.bookMode
      ? 'Select questions from the list to include in the generated test, then click Generate Test.'
      : 'Choose Open or Closed book to configure your test.';
    elements.questionCategory.textContent = 'Test builder';
    elements.questionDifficulty.textContent =
      state.testMode.genMode === 'manual' ? 'Manual selection' : 'Auto selection';
    elements.prevBtn.classList.add('hidden');
    elements.nextBtn.classList.add('hidden');
    elements.submitAnswerBtn.classList.add('hidden');
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    elements.submitAnswerBtn.disabled = true;
  };

  const setChoiceText = (texts) => {
    const clean = (val) => {
      if (val === undefined || val === null) return '';
      return String(val).replace(/\s+/g, ' ').trim();
    };
    elements.choiceAText.textContent = clean(texts[0]);
    elements.choiceBText.textContent = clean(texts[1]);
    elements.choiceCText.textContent = clean(texts[2]);
    elements.choiceDText.textContent = clean(texts[3]);
    elements.choiceEText.textContent = clean(texts[4]);
  };

  const getChoiceInputs = () => Array.from(elements.choicesForm.querySelectorAll('input[name="choice"]'));

  const getChoiceElements = () => ({
    A: elements.choicesForm.querySelector('[data-choice="A"]'),
    B: elements.choicesForm.querySelector('[data-choice="B"]'),
    C: elements.choicesForm.querySelector('[data-choice="C"]'),
    D: elements.choicesForm.querySelector('[data-choice="D"]'),
    E: elements.choicesForm.querySelector('[data-choice="E"]'),
  });

  const setChoiceInputType = (type) => {
    getChoiceInputs().forEach((input) => {
      if (input.type !== type) {
        input.checked = false;
        input.type = type;
      }
    });
  };

  const updateChoiceVisibility = (question) => {
    const choiceEls = getChoiceElements();
    const isTrueFalse = question?.isTrueFalse;
    ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
      const el = choiceEls[letter];
      if (!el) return;
      const choiceText = question?.choices?.[letter];
      const normalized = choiceText !== undefined && choiceText !== null ? String(choiceText).trim() : '';
      const hasText = normalized !== '';
      const isPlaceholder = normalized.toLowerCase().startsWith('choice') && normalized.toLowerCase().endsWith('not provided');
      const shouldHide =
        (isTrueFalse && (letter === 'C' || letter === 'D' || letter === 'E')) || !hasText || isPlaceholder;
      el.classList.toggle('hidden', !!shouldHide);
      const input = el.querySelector('input[name="choice"]');
      if (shouldHide && input) {
        input.checked = false;
      }
    });
  };

  const setChoiceInputsDisabled = (disabled) => {
    getChoiceInputs().forEach((input) => {
      input.disabled = disabled;
      if (disabled) input.checked = false;
    });
  };

  const setSelectedChoices = (choices) => {
    const normalized = new Set((choices || []).map((c) => String(c).toUpperCase()));
    getChoiceInputs().forEach((input) => {
      input.checked = normalized.has(input.value.toUpperCase());
    });
  };

  const getSelectedChoicesFromForm = () =>
    getChoiceInputs()
      .filter((input) => input.checked)
      .map((input) => input.value.toUpperCase());

  const handleAnswerChange = (event) => {
    if (state.currentMode === 'test') return;
    if (event.target.name !== 'choice') return;
    const question = state.filteredQuestions[state.currentIndex];
    if (!question) return;
    const selectedChoices = getSelectedChoicesFromForm();
    const isCorrect = evaluateChoiceResponse(question, selectedChoices);

    state.answers[question.id] = {
      ...(state.answers[question.id] || {}),
      selectedChoice: selectedChoices[0] || null,
      selectedChoices,
      isCorrect,
      manualCorrect: false,
      revealed: false,
    };

    resetAnswerReveal();
    clearError();
    updateSummary();
  };

  const handleFillInput = (event) => {
    if (state.currentMode === 'test') return;
    const question = state.filteredQuestions[state.currentIndex];
    if (!question || !question.isFillBlank) return;
    const fillText = event.target.value || '';
    const isCorrect = evaluateFillResponse(question, fillText);

    state.answers[question.id] = {
      ...(state.answers[question.id] || {}),
      fillText,
      isCorrect,
      manualCorrect: false,
      revealed: false,
    };
    resetAnswerReveal();
    clearError();
    updateSummary();
  };

  const isAnswered = (question, entry) => {
    if (!entry || !entry.revealed) return false;
    if (question.isFillBlank) {
      return !!entry.fillText && entry.fillText.trim() !== '';
    }
    const selectedChoices =
      entry.selectedChoices && entry.selectedChoices.length
        ? entry.selectedChoices
        : entry.selectedChoice
          ? [entry.selectedChoice]
          : [];
    return selectedChoices.length > 0;
  };

  const getSessionStats = (pool) => {
    const total = pool.length;
    let answered = 0;
    let correct = 0;

    pool.forEach((q) => {
      const entry = state.answers[q.id];
      if (!isAnswered(q, entry)) return;
      answered += 1;
      if (entry.isCorrect) correct += 1;
    });

    const percent = total ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, percent };
  };

  const getMissedQuestions = () => {
    const base = state.sessionBaseQuestions.length ? state.sessionBaseQuestions : state.filteredQuestions;
    return base.filter((q) => {
      const entry = state.answers[q.id];
      return isAnswered(q, entry) && !entry.isCorrect;
    });
  };

  const submitAnswer = () => {
    if (state.currentMode === 'test') return;
    const question = state.filteredQuestions[state.currentIndex];
    if (!question) return;
    const existing = state.answers[question.id] || { selectedChoice: null, selectedChoices: [], fillText: '' };
    const isLast = state.currentIndex >= state.filteredQuestions.length - 1;
    let selectedChoice = existing.selectedChoice;
    let selectedChoices = existing.selectedChoices || [];
    let fillText = existing.fillText || '';
    let isCorrect = false;

    if (question.isFillBlank) {
      fillText = elements.fillInput.value || fillText || '';
      if (!fillText.trim()) {
        showError('Enter an answer before submitting.');
        return;
      }
      isCorrect = evaluateFillResponse(question, fillText);
    } else {
      selectedChoices = getSelectedChoicesFromForm();
      selectedChoice = selectedChoices[0] || selectedChoice;
      if (!selectedChoices.length) {
        showError('Select an answer before submitting.');
        return;
      }
      isCorrect = evaluateChoiceResponse(question, selectedChoices);
    }

    clearError();
    const updated = {
      ...existing,
      selectedChoice,
      selectedChoices,
      fillText,
      isCorrect,
      manualCorrect: false,
      revealed: true,
    };
    state.answers[question.id] = updated;
    revealAnswer(question, updated);
    elements.submitAnswerBtn.classList.add('hidden');
    elements.nextBtn.classList.remove('hidden');
    elements.nextBtn.disabled = isLast;
    updateSummary();

    if (isLast) {
      showSessionSummary();
    }
  };

  const formatChoiceLabel = (question, letter) => {
    if (!letter) return '';
    const raw = question.choices?.[letter] || '';
    const text = raw ? raw.toString().replace(/\s+/g, ' ').trim() : '';
    return text ? `${letter}) ${text}` : `${letter})`;
  };

  const formatChoiceList = (question, letters) => {
    const normalized = (letters || []).map((c) => String(c).toUpperCase());
    const ordered = ['A', 'B', 'C', 'D', 'E'].filter((letter) => normalized.includes(letter));
    if (!ordered.length) return '(no response)';
    return ordered.map((letter) => formatChoiceLabel(question, letter)).join(', ');
  };

  const revealAnswer = (question, answerState) => {
    resetAnswerReveal();

    const selectedChoice = answerState.selectedChoice || null;
    const selectedChoices =
      answerState.selectedChoices && answerState.selectedChoices.length
        ? answerState.selectedChoices.map((c) => c.toUpperCase())
        : selectedChoice
          ? [selectedChoice.toUpperCase()]
          : [];
    const correctChoices = getCorrectChoices(question);
    const correctChoice = correctChoices[0] || null;
    const correctSet = new Set(correctChoices);
    const selectedSet = new Set(selectedChoices);
    const isManual = !!answerState.manualCorrect;
    const isCorrect = !!answerState.isCorrect;

    if (!question.isFillBlank) {
      elements.choicesForm.querySelectorAll('.choice').forEach((choiceEl) => {
        const letter = choiceEl.dataset.choice;
        if (correctSet.has(letter)) {
          choiceEl.classList.add('correct');
        }
        if (selectedSet.has(letter) && !correctSet.has(letter)) {
          choiceEl.classList.add('incorrect');
        }
      });
    }

    elements.resultText.textContent = isCorrect ? (isManual ? 'Marked correct' : 'Correct!') : 'Incorrect';
    elements.resultText.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (question.isFillBlank) {
      const submitted = (answerState.fillText || '').trim();
      elements.userAnswerText.textContent = submitted
        ? `Your answer: ${submitted}`
        : 'Your answer: (no response)';
      elements.userAnswerText.classList.add(isCorrect ? 'correct' : 'incorrect');
      elements.answerText.textContent = `Correct answer: ${question.fillAnswer || 'N/A'}`;
      elements.answerText.classList.add('correct');
      if (elements.markCorrectBtn) {
        elements.markCorrectBtn.classList.remove('hidden');
        elements.markCorrectBtn.textContent = isManual ? 'Unmark correct' : 'Mark as correct';
      }
    } else {
      const userLabel = formatChoiceList(question, Array.from(selectedSet));
      const correctLabel = correctChoices.length ? formatChoiceList(question, correctChoices) : 'N/A';
      elements.userAnswerText.textContent = `Your answer: ${userLabel}`;
      elements.userAnswerText.classList.add(isCorrect ? 'correct' : 'incorrect');
      elements.answerText.textContent = `Correct answer: ${correctLabel}`;
      elements.answerText.classList.add('correct');
      if (elements.markCorrectBtn) {
        elements.markCorrectBtn.classList.add('hidden');
      }
    }

    if (question.reference) {
      elements.referenceText.textContent = `Reference: ${question.reference}`;
      elements.referenceText.classList.remove('hidden');
    } else {
      elements.referenceText.textContent = '';
      elements.referenceText.classList.add('hidden');
    }
    elements.answerReveal.classList.remove('hidden');
  };

  const goToNextQuestion = () => {
    if (state.currentIndex < state.filteredQuestions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      updateSummary();
    }
  };

  const goToPreviousQuestion = () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
      updateSummary();
    }
  };

  const updateSummary = () => {
    const total = state.filteredQuestions.length;
    let answered = 0;
    let correct = 0;

    state.filteredQuestions.forEach((q) => {
      const entry = state.answers[q.id];
      if (!isAnswered(q, entry)) return;
      answered += 1;
      if (entry.isCorrect) correct += 1;
    });

    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    elements.answeredCount.textContent = `Answered: ${answered} of ${total}`;
    elements.correctCount.textContent = `Correct: ${correct}`;
    elements.accuracyStat.textContent = `Accuracy: ${accuracy}%`;
  };

  const showSessionSummary = () => {
    if (state.currentMode === 'test') return;
    const basePool =
      state.reviewMode && state.filteredQuestions.length
        ? state.filteredQuestions
        : state.sessionBaseQuestions.length
          ? state.sessionBaseQuestions
          : state.filteredQuestions;
    const stats = getSessionStats(basePool);
    const missed = getMissedQuestions();

    if (elements.summaryPercent) elements.summaryPercent.textContent = `Score: ${stats.percent}%`;
    if (elements.summaryDetails)
      elements.summaryDetails.textContent = `Answered ${stats.answered} of ${stats.total} • Correct ${stats.correct}`;
    if (elements.reviewMissedBtn) elements.reviewMissedBtn.disabled = missed.length === 0;

    elements.questionCard?.classList.add('hidden');
    elements.actions?.classList.add('hidden');
    elements.summaryBar?.classList.add('hidden');
    elements.sessionSummary?.classList.remove('hidden');
  };

  const startOverSession = () => {
    const base = state.sessionBaseQuestions.length ? state.sessionBaseQuestions : state.allQuestions;
    state.filteredQuestions = [...base];
    state.currentIndex = 0;
    state.answers = {};
    state.reviewMode = false;
    hideSessionSummary();
    renderQuestion();
    updateSummary();
  };

  const reviewMissedQuestions = () => {
    const missed = getMissedQuestions();
    if (!missed.length) return;
    missed.forEach((q) => {
      delete state.answers[q.id]; // clear old response so the question is fresh
    });
    state.filteredQuestions = missed;
    state.currentIndex = 0;
    state.reviewMode = true;
    hideSessionSummary();
    renderQuestion();
    updateSummary();
  };

  const clearError = () => {
    elements.errorBanner.textContent = '';
    elements.errorBanner.classList.add('hidden');
  };

  const showError = (message) => {
    elements.errorBanner.textContent = message;
    elements.errorBanner.classList.remove('hidden');
  };

  return { init };
})();

window.addEventListener('DOMContentLoaded', QuizApp.init);

