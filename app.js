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
 */
const QuizApp = (() => {
  const state = {
    allQuestions: [],
    filteredQuestions: [],
    currentIndex: 0,
    answers: {}, // keyed by question id -> { selectedChoice, isCorrect, revealed }
    filters: {
      category: 'all',
      shuffle: false,
    },
    testMode: {
      bookMode: 'all', // all | open | closed
      category: 'all',
      shuffle: false,
      genMode: 'auto',
    },
    currentMode: null, // null | 'study' | 'test'
    manualSelection: new Set(),
  };

  const elements = {};

  const init = () => {
    cacheElements();
    wireEvents();
    renderLoadState();
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
    elements.resetTestBtn = document.getElementById('resetTestBtn');
    elements.toModeFromTest = document.getElementById('toModeFromTest');
    elements.manualPanel = document.getElementById('manualTestPanel');
    elements.manualList = document.getElementById('manualList');
    elements.manualCategorySelect = document.getElementById('manualCategorySelect');
    elements.selectAllManual = document.getElementById('selectAllManual');
    elements.clearManual = document.getElementById('clearManual');

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
    elements.choicesForm = document.getElementById('choicesForm');
    elements.fillContainer = document.getElementById('fillContainer');
    elements.fillInput = document.getElementById('fillInput');
    elements.answerReveal = document.getElementById('answerReveal');
    elements.answerText = document.getElementById('answerText');
    elements.referenceText = document.getElementById('referenceText');

    elements.showAnswerBtn = document.getElementById('showAnswerBtn');
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
  };

  const wireEvents = () => {
    elements.fileInput.addEventListener('change', handleFileSelected);
    elements.answerFileInput.addEventListener('change', clearError);
    elements.loadBtn.addEventListener('click', handleLoadClick);
    elements.backToFilesBtn.addEventListener('click', renderLoadState);
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
        state.testMode.bookMode = e.target.value;
        renderManualList();
      }),
    );
    elements.genModeRadios.forEach((r) =>
      r.addEventListener('change', (e) => {
        state.testMode.genMode = e.target.value;
        renderManualList();
      }),
    );
    elements.testShuffleToggle.addEventListener('change', (e) => {
      state.testMode.shuffle = e.target.checked;
    });
    elements.testCategorySelect.addEventListener('change', (e) => {
      state.testMode.category = e.target.value;
      renderManualList();
    });
    elements.manualCategorySelect.addEventListener('change', renderManualList);
    elements.selectAllManual.addEventListener('click', selectAllManualVisible);
    elements.clearManual.addEventListener('click', clearManualSelection);
    elements.generateTestBtn.addEventListener('click', generateTest);
    elements.resetTestBtn.addEventListener('click', () => {
      state.testMode = { bookMode: 'all', category: 'all', shuffle: false, genMode: 'auto' };
      state.manualSelection = new Set();
      elements.bookModeRadios.forEach((r) => (r.checked = r.value === 'all'));
      elements.genModeRadios.forEach((r) => (r.checked = r.value === 'auto'));
      elements.testCategorySelect.value = 'all';
      elements.testShuffleToggle.checked = false;
      elements.manualCategorySelect.value = 'all';
      renderManualList();
      resetFilters();
    });
    elements.toModeFromTest.addEventListener('click', showModeSelection);

    elements.prevBtn.addEventListener('click', goToPreviousQuestion);
    elements.nextBtn.addEventListener('click', goToNextQuestion);
    elements.showAnswerBtn.addEventListener('click', showCorrectAnswer);
    elements.choicesForm.addEventListener('change', handleAnswerChange);
    elements.fillInput.addEventListener('input', handleFillInput);
  };

  const renderLoadState = () => {
    elements.quizScreen.classList.add('hidden');
    elements.modeScreen.classList.add('hidden');
    elements.appHeader.classList.add('hidden');
    elements.loadScreen.classList.remove('hidden');
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
    const normalizeChoice = (value, placeholder) =>
      value === undefined || value === null || value === '' ? placeholder : String(value);

    const correct = (item.correct_choice || '').toString().trim().toUpperCase();
    const validCorrect = ['A', 'B', 'C', 'D'].includes(correct) ? correct : null;
    const fillRaw = item.fill_in_blank ?? item.fillInBlank ?? item.fill_blank ?? item.fill;
    const fillFlag = (fillRaw || '').toString().trim();
    const isFillBlank = fillFlag === '1' || fillFlag.toLowerCase() === 'true';
    const openRaw = item.open_book ?? item.blnOpen ?? item.open ?? item.is_open;
    const openFlag = (openRaw || '').toString().trim().toLowerCase();
    let isOpenBook = null;
    if (openFlag === '1' || openFlag === 'true') isOpenBook = true;
    if (openFlag === '0' || openFlag === 'false') isOpenBook = false;

    return {
      id: toDisplay(item.id, fallbackId),
      question: toDisplay(item.question, `Question ${index + 1}`),
      choices: {
        A: normalizeChoice(item.choice_a, 'Choice A not provided'),
        B: normalizeChoice(item.choice_b, 'Choice B not provided'),
        C: normalizeChoice(item.choice_c, 'Choice C not provided'),
        D: normalizeChoice(item.choice_d, 'Choice D not provided'),
      },
      correctChoice: validCorrect,
      category: toDisplay(item.category, 'Uncategorized'),
      difficulty: toDisplay(item.difficulty, 'Unspecified'),
      reference: toDisplay(item.reference, ''),
      isFillBlank,
      fillAnswer: '',
      isOpenBook,
    };
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

    const letters = ['A', 'B', 'C', 'D'];

    return questions.map((q) => {
      const list = answerMap.get(q.id) || [];
      if (!list.length) return q;

      if (q.isFillBlank) {
        const corrects = list.filter((a) => a.isCorrect).map((a) => a.answerText).filter(Boolean);
        const fillAnswer = corrects.length ? corrects.join(' / ') : (list[0]?.answerText || '');
        return {
          ...q,
          fillAnswer,
          correctChoice: null,
          choices: q.choices,
        };
      }

       const correctIndex = list.findIndex((a) => a.isCorrect);

      // Take first four; if the correct answer is beyond the first four, ensure it is included.
      let top = list.slice(0, 4);
      if (correctIndex >= 4) {
        top = [...top];
        top[top.length - 1] = list[correctIndex]; // replace last slot with correct answer
      }

      const updatedChoices = { ...q.choices };
      let derivedCorrect = q.correctChoice;

      letters.forEach((letter, idx) => {
        const ans = top[idx];
        updatedChoices[letter] =
          ans && ans.answerText ? ans.answerText : q.choices[letter] || `Choice ${letter} not provided`;
        if (ans && ans.isCorrect) {
          derivedCorrect = letter;
        }
      });

      return {
        ...q,
        choices: updatedChoices,
        correctChoice: derivedCorrect,
      };
    });
  };

  const populateFilterOptions = () => {
    const categories = new Set(['all']);
    state.allQuestions.forEach((q) => {
      categories.add(q.category || 'Uncategorized');
    });

    const setOptions = (select, options, label) => {
      select.innerHTML = '';
      const sorted = Array.from(options).sort((a, b) => (a > b ? 1 : -1));
      sorted.forEach((opt) => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        if (opt === 'all') {
          optionEl.textContent = `All ${label}`;
        } else {
          optionEl.textContent = opt;
        }
        select.appendChild(optionEl);
      });
      select.value = 'all';
    };

    setOptions(elements.categoryFilter, categories, 'categories');
    setOptions(elements.testCategorySelect, categories, 'categories');
    setOptions(elements.manualCategorySelect, categories, 'categories');
    elements.shuffleToggle.checked = false;
    state.filters = { category: 'all', bookMode: 'all', shuffle: false };
    state.testMode = { bookMode: 'all', category: 'all', shuffle: false, genMode: 'auto' };
    elements.bookModeRadios?.forEach((r) => (r.checked = r.value === 'all'));
    elements.genModeRadios?.forEach((r) => (r.checked = r.value === 'auto'));
    elements.testShuffleToggle.checked = false;
    elements.testCategorySelect.value = 'all';
    elements.studyBookSelect.value = 'all';
    elements.manualCategorySelect.value = 'all';
    state.manualSelection = new Set();
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
    renderQuestion();
    updateSummary();
  };

  const resetFilters = () => {
    elements.categoryFilter.value = 'all';
    elements.shuffleToggle.checked = false;
    elements.studyBookSelect.value = 'all';
    state.filters = { category: 'all', bookMode: 'all', shuffle: false };
    state.filteredQuestions = state.allQuestions.length ? [...state.allQuestions] : [];
    state.currentIndex = 0;
    state.answers = {};
    renderQuestion();
    updateSummary();
  };

  const generateTest = () => {
    if (!state.allQuestions.length) return;
    const bookMode = state.testMode.bookMode || 'all';
    const category = elements.testCategorySelect.value || 'all';
    const shuffle = state.testMode.shuffle;
    const genMode = state.testMode.genMode || 'auto';

    let base = state.allQuestions.filter((q) => {
      const matchesCategory = category === 'all' || q.category === category;
      let matchesBook = true;
      if (bookMode === 'open') matchesBook = q.isOpenBook === true;
      if (bookMode === 'closed') matchesBook = q.isOpenBook === false;
      return matchesCategory && matchesBook;
    });

    if (genMode === 'manual') {
      // Use manually selected IDs; fall back to none if empty.
      base = base.filter((q) => state.manualSelection.has(q.id));
      if (!base.length) {
        showError('No manual questions selected. Check boxes to include questions.');
        return;
      }
    } else if (shuffle) {
      base = shuffleArray(base);
    }

    state.filteredQuestions = base;
    state.currentIndex = 0;
    state.answers = {};
    renderQuestion();
    updateSummary();

    // Build printable test
    openPrintableTest(base);
  };

  const renderManualList = () => {
    if (state.testMode.genMode !== 'manual' || !state.allQuestions.length) {
      elements.manualPanel.classList.add('hidden');
      return;
    }
    elements.manualPanel.classList.remove('hidden');
    const bookMode = state.testMode.bookMode || 'all';
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
  };

  const selectAllManualVisible = () => {
    elements.manualList.querySelectorAll('.manual-item').forEach((row) => {
      const cb = row.querySelector('input[type="checkbox"]');
      cb.checked = true;
      const idAttr = row.dataset.qid;
      if (idAttr) state.manualSelection.add(idAttr);
    });
  };

  const clearManualSelection = () => {
    state.manualSelection = new Set();
    elements.manualList.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  };

  const openPrintableTest = (questions) => {
    const win = window.open('', '_blank');
    if (!win) return;
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
                    : `<ul>
                        <li>A) ${q.choices.A}</li>
                        <li>B) ${q.choices.B}</li>
                        <li>C) ${q.choices.C}</li>
                        <li>D) ${q.choices.D}</li>
                      </ul>`
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
    elements.testControls.classList.remove('hidden');
    state.filteredQuestions = [];
    state.currentIndex = 0;
    state.answers = {};
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

  const updateHeader = () => {
    const total = state.filteredQuestions.length;
    const current = total ? state.currentIndex + 1 : 0;
    elements.totalCount.textContent = `Total: ${total}`;
    elements.progressText.textContent = `Question ${current} of ${total}`;
  };

  const renderQuestion = () => {
    updateHeader();
    const question = state.filteredQuestions[state.currentIndex];

    // Clear any previous correct highlights.
    elements.choicesForm.querySelectorAll('.choice').forEach((choice) => {
      choice.classList.remove('correct');
    });

    if (!question) {
      elements.questionText.textContent =
        'No questions match these filters. Adjust the category/book filters or reset filters.';
      setChoiceText(['—', '—', '—', '—']);
      setChoiceInputsDisabled(true);
      elements.answerReveal.classList.add('hidden');
      elements.questionCategory.textContent = 'Category';
      elements.questionDifficulty.textContent = 'Difficulty';
      elements.prevBtn.disabled = true;
      elements.nextBtn.disabled = true;
      elements.showAnswerBtn.disabled = true;
      return;
    }

    const isFill = question.isFillBlank;
    if (isFill) {
      elements.fillContainer.classList.remove('hidden');
      elements.choicesForm.classList.add('hidden');
    } else {
      elements.fillContainer.classList.add('hidden');
      elements.choicesForm.classList.remove('hidden');
    }

    setChoiceInputsDisabled(false);
    elements.questionText.textContent = question.question || 'Question text missing.';
    setChoiceText([
      question.choices.A || 'Choice A not provided',
      question.choices.B || 'Choice B not provided',
      question.choices.C || 'Choice C not provided',
      question.choices.D || 'Choice D not provided',
    ]);

    elements.questionCategory.textContent = question.category || 'Uncategorized';
    elements.questionDifficulty.textContent = question.difficulty || 'Unspecified';

    const saved = state.answers[question.id] || {
      selectedChoice: null,
      isCorrect: false,
      revealed: false,
      fillText: '',
    };
    setSelectedChoice(saved.selectedChoice);
    if (isFill) {
      elements.fillInput.value = saved.fillText || '';
    } else {
      elements.fillInput.value = '';
    }

    elements.prevBtn.disabled = state.currentIndex === 0;
    elements.nextBtn.disabled = state.currentIndex >= state.filteredQuestions.length - 1;
    elements.showAnswerBtn.disabled = false;

    if (saved.revealed) {
      revealAnswer(question, saved);
    } else {
      elements.answerReveal.classList.add('hidden');
    }
  };

  const setChoiceText = (texts) => {
    elements.choiceAText.textContent = texts[0];
    elements.choiceBText.textContent = texts[1];
    elements.choiceCText.textContent = texts[2];
    elements.choiceDText.textContent = texts[3];
  };

  const setChoiceInputsDisabled = (disabled) => {
    elements.choicesForm.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = disabled;
      input.checked = false;
    });
  };

  const setSelectedChoice = (choice) => {
    elements.choicesForm.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = input.value === choice;
    });
  };

  const handleAnswerChange = (event) => {
    if (event.target.name !== 'choice') return;
    const question = state.filteredQuestions[state.currentIndex];
    if (!question) return;
    const selectedChoice = event.target.value;
    const isCorrect = question.correctChoice
      ? selectedChoice.toUpperCase() === question.correctChoice
      : false;

    state.answers[question.id] = {
      ...(state.answers[question.id] || {}),
      selectedChoice,
      isCorrect,
      revealed: state.answers[question.id]?.revealed || false,
    };

    updateSummary();
  };

  const handleFillInput = (event) => {
    const question = state.filteredQuestions[state.currentIndex];
    if (!question || !question.isFillBlank) return;
    const fillText = event.target.value || '';
    const isCorrect =
      question.fillAnswer && fillText.trim().length
        ? fillText.trim().toLowerCase() === question.fillAnswer.trim().toLowerCase()
        : false;

    state.answers[question.id] = {
      ...(state.answers[question.id] || {}),
      fillText,
      isCorrect,
      revealed: state.answers[question.id]?.revealed || false,
    };
    updateSummary();
  };

  const showCorrectAnswer = () => {
    const question = state.filteredQuestions[state.currentIndex];
    if (!question) return;
    const existing = state.answers[question.id] || { selectedChoice: null, isCorrect: false };
    let isCorrect = existing.isCorrect;

    if (question.isFillBlank) {
      if (existing.fillText && question.fillAnswer) {
        isCorrect = existing.fillText.trim().toLowerCase() === question.fillAnswer.trim().toLowerCase();
      } else {
        isCorrect = false;
      }
    } else {
      isCorrect = question.correctChoice
        ? existing.selectedChoice?.toUpperCase() === question.correctChoice
        : false;
    }

    state.answers[question.id] = { ...existing, isCorrect, revealed: true };
    revealAnswer(question, state.answers[question.id]);
    updateSummary();
  };

  const revealAnswer = (question, answerState) => {
    elements.choicesForm.querySelectorAll('.choice').forEach((choiceEl) => {
      choiceEl.classList.remove('correct');
      if (!question.isFillBlank && choiceEl.dataset.choice === question.correctChoice) {
        choiceEl.classList.add('correct');
      }
    });

    const correctText = question.isFillBlank
      ? `Correct answer: ${question.fillAnswer || 'N/A'}`
      : question.correctChoice
        ? `Correct answer: ${question.correctChoice}`
        : 'Correct answer: N/A';
    elements.answerText.textContent = correctText;
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
      if (!entry) return;
      if (q.isFillBlank) {
        if (entry.fillText && entry.fillText.trim() !== '') {
          answered += 1;
          if (entry.isCorrect) correct += 1;
        }
      } else if (entry.selectedChoice) {
        answered += 1;
        if (entry.isCorrect) correct += 1;
      }
    });

    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    elements.answeredCount.textContent = `Answered: ${answered} of ${total}`;
    elements.correctCount.textContent = `Correct: ${correct}`;
    elements.accuracyStat.textContent = `Accuracy: ${accuracy}%`;
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

