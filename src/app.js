const app = document.querySelector('#app')
const difficulties = {
  easy: { label: 'かんたん', columns: 4, rows: 3 },
  normal: { label: 'ふつう', columns: 6, rows: 4 },
  hard: { label: 'むずかしい', columns: 8, rows: 6 },
}
let cats = []
let selectedCat = null
let selectedDifficulty = 'easy'
let activeDrag = null
let lastTouchedTimer = null

// 指で置きやすいように、正解マスの外側まで当たり判定を広げる割合。
// 判定同士が重なっても、ピースごとに自分の正解マスだけを見るため問題ない。
const dropTargetExpansion = 0.6

// 選択中の難易度の設定と、そのときに使うピース数を返す
const currentDifficulty = () => difficulties[selectedDifficulty]
const currentPieceCount = () => {
  const { columns, rows } = currentDifficulty()
  return columns * rows
}

// このモジュールの場所を基準に、画面に表示する画像のURLを作る
const publicUrl = (path) => new URL(`../public/${path}`, import.meta.url).href
const imageUrl = (cat) => publicUrl(`images/cat-images/${cat.fileName}`)

// 配列の要素をランダムな順番に並べ替えた新しい配列を返す
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

// 猫写真を選ぶ最初の画面を表示する
const showStart = () => {
  clearLastTouched()
  activeDrag = null
  selectedCat ||= cats[0]
  app.innerHTML = `
    <header class="page-header">
      <h1>ねこパズル</h1>
      <p>すきなねこをえらんで、パズルをはじめよう！</p>
    </header>
    <section class="photo-list" aria-label="ねこの写真をえらぶ">
      ${cats.map((cat) => `
        <label class="photo-card ${cat.id === selectedCat.id ? 'is-selected' : ''}">
          <input class="photo-radio" name="selected-cat" value="${cat.id}" type="radio" ${cat.id === selectedCat.id ? 'checked' : ''}>
          <img src="${imageUrl(cat)}" alt="${cat.altText}">
          <span>${cat.title}</span>
        </label>
      `).join('')}
    </section>
    <fieldset class="difficulty-list">
      <legend>むずかしさを えらぼう</legend>
      ${Object.entries(difficulties).map(([id, difficulty]) => `
        <label class="difficulty-option ${id === selectedDifficulty ? 'is-selected' : ''}">
          <input class="difficulty-radio" name="selected-difficulty" value="${id}" type="radio" ${id === selectedDifficulty ? 'checked' : ''}>
          <span>${difficulty.label}</span>
          <small>${difficulty.columns} × ${difficulty.rows}（${difficulty.columns * difficulty.rows}ピース）</small>
        </label>
      `).join('')}
    </fieldset>
    <button class="primary-button" id="start-button" type="button">このねこで はじめる</button>
  `
  app.querySelectorAll('[name="selected-cat"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      selectedCat = cats.find((cat) => cat.id === radio.value)
      showStart()
    })
  })
  app.querySelectorAll('[name="selected-difficulty"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      selectedDifficulty = radio.value
      showStart()
    })
  })
  app.querySelector('#start-button').addEventListener('click', showGame)
}

// 指定した番号の写真部分を表示する、ドラッグ可能なピースを作る
const createPiece = (pieceIndex) => {
  const { columns, rows } = currentDifficulty()
  const row = Math.floor(pieceIndex / columns)
  const column = pieceIndex % columns
  const piece = document.createElement('button')
  piece.type = 'button'
  piece.className = 'piece'
  piece.dataset.pieceIndex = String(pieceIndex)
  piece.setAttribute('aria-label', `パズルのピース ${pieceIndex + 1}`)
  piece.style.setProperty('--photo-url', `url("${imageUrl(selectedCat)}")`)
  piece.style.setProperty('--background-position', `${(column / (columns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`)
  piece.style.setProperty('--background-size', `${columns * 100}% ${rows * 100}%`)
  piece.style.setProperty('--piece-aspect', `${rows * 4} / ${columns * 3}`)
  piece.addEventListener('pointerdown', startDrag)
  return piece
}

// 選んだ猫写真を使い、盤面とピース置き場を表示する
const showGame = () => {
  clearLastTouched()
  activeDrag = null
  const difficulty = currentDifficulty()
  const pieceCount = currentPieceCount()
  app.innerHTML = `
    <div class="game-toolbar">
      <h1>${selectedCat.title}のパズル（${difficulty.label}）</h1>
      <button class="secondary-button" id="back-button" type="button">ねこ・むずかしさをえらぶ</button>
    </div>
    <div class="game-layout">
      <section class="board-area">
        <h2>ここに おこう</h2>
        <p class="hint">ピースをドラッグして、おなじばしょの近くに おこう！</p>
        <div class="board" id="board" style="--photo-url: url('${imageUrl(selectedCat)}'); --grid-columns: ${difficulty.columns}; --grid-rows: ${difficulty.rows}"></div>
      </section>
      <section class="tray-area">
        <h2>ピース</h2>
        <p class="hint">すきなピースから はじめよう</p>
        <div class="tray ${pieceCount > 24 ? 'is-scrollable' : ''}" id="tray" style="--piece-aspect: ${difficulty.rows * 4} / ${difficulty.columns * 3}; --tray-columns: ${difficulty.columns}; --tray-rows: ${difficulty.rows}" aria-label="パズルのピース置き場"></div>
      </section>
    </div>
  `
  const board = app.querySelector('#board')
  const tray = app.querySelector('#tray')
  Array.from({ length: pieceCount }, (_, index) => {
    const slot = document.createElement('div')
    slot.className = 'slot'
    slot.dataset.slotIndex = String(index)
    board.append(slot)
  })
  shuffle(Array.from({ length: pieceCount }, (_, index) => index))
    .forEach((index) => tray.append(createPiece(index)))
  app.querySelector('#back-button').addEventListener('click', showStart)
}

// ピースを押したときに、ドラッグ用のプレビューを作って動かし始める
const startDrag = (event) => {
  const piece = event.currentTarget
  if (piece.parentElement.classList.contains('slot')) return
  event.preventDefault()
  clearLastTouched()
  const preview = piece.cloneNode(true)
  preview.className = 'piece drag-preview'
  preview.style.width = `${piece.getBoundingClientRect().width}px`
  document.body.append(preview)
  piece.classList.add('is-source')
  piece.setPointerCapture(event.pointerId)
  activeDrag = {
    piece,
    preview,
    pointerId: event.pointerId,
    origin: piece.parentElement,
    nextSibling: piece.nextElementSibling,
  }
  movePreview(event)
  piece.addEventListener('pointermove', movePreview)
  // キャプチャ段階で終了イベントを受け、素早く離した場合でも
  // lostpointercapture より先に置き場所の判定を終える。
  window.addEventListener('pointerup', finishDrag, true)
  window.addEventListener('pointercancel', cancelDrag, true)
  // OSによる操作中断などで pointerup が届かない場合も、プレビューを残さない。
  piece.addEventListener('lostpointercapture', clearDrag, { once: true })
}

// 指やマウスの位置に合わせて、ドラッグ中のプレビューを移動する
const movePreview = (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return
  activeDrag.preview.style.left = `${event.clientX}px`
  activeDrag.preview.style.top = `${event.clientY}px`
}

// 指やマウスを離したときに、正解判定とピースの配置を行う
const finishDrag = (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return
  const { piece, origin, nextSibling } = activeDrag
  const target = findCorrectSlot(piece)
  const isCorrectSlot = target && isWithinDropTarget(target, event.clientX, event.clientY)
  clearDrag()
  if (!isCorrectSlot) {
    if (nextSibling) origin.insertBefore(piece, nextSibling)
    else origin.append(piece)
    markLastTouched(piece)
    return
  }
  target.append(piece)
  target.classList.add('is-filled')
  markLastTouched(piece)
  if (app.querySelectorAll('.slot.is-filled').length === currentPieceCount()) showComplete()
}

// 操作が中断されたときは、ドラッグ中のポインターだった場合だけ終了する
const cancelDrag = (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return
  clearDrag()
}

// 置けなかったピースを点滅させ、次に操作するピースを分かりやすくする
const markLastTouched = (piece) => {
  clearLastTouched()
  piece.classList.add('is-last-touched')
  lastTouchedTimer = window.setTimeout(() => {
    piece.classList.remove('is-last-touched')
    lastTouchedTimer = null
  }, 3000)
}

// 点滅中のピースと、その点滅を終えるためのタイマーを解除する
const clearLastTouched = () => {
  if (lastTouchedTimer) window.clearTimeout(lastTouchedTimer)
  app.querySelectorAll('.piece.is-last-touched').forEach((lastPiece) => {
    lastPiece.classList.remove('is-last-touched')
  })
  lastTouchedTimer = null
}

// ピース自身の正解マスを返す。ほかのマスに重なっていても、このマスの判定だけを使う。
const findCorrectSlot = (piece) => app.querySelector(
  `.slot[data-slot-index="${piece.dataset.pieceIndex}"]`,
)

// 正解マスの周囲まで広げた範囲に、指やマウスの位置が入っているか調べる
const isWithinDropTarget = (slot, x, y) => {
  const rect = slot.getBoundingClientRect()
  const horizontalPadding = rect.width * dropTargetExpansion
  const verticalPadding = rect.height * dropTargetExpansion
  return x >= rect.left - horizontalPadding && x <= rect.right + horizontalPadding
    && y >= rect.top - verticalPadding && y <= rect.bottom + verticalPadding
}

// ドラッグ用プレビューを消し、ドラッグ中の状態を終了する
const clearDrag = () => {
  if (activeDrag) {
    activeDrag.piece.removeEventListener('pointermove', movePreview)
    activeDrag.piece.removeEventListener('lostpointercapture', clearDrag)
    activeDrag.piece.classList.remove('is-source')
  }
  window.removeEventListener('pointerup', finishDrag, true)
  window.removeEventListener('pointercancel', cancelDrag, true)
  document.querySelectorAll('.drag-preview').forEach((preview) => preview.remove())
  activeDrag = null
}

// すべてのピースが正しい場所に置かれたとき、完成画面を表示する
const showComplete = () => {
  clearLastTouched()
  activeDrag = null
  const difficulty = currentDifficulty()
  app.innerHTML = `
    <section class="completion">
      <h1>かんせい！</h1>
      <p>${difficulty.label}を クリアしたよ！</p>
      <img src="${imageUrl(selectedCat)}" alt="${selectedCat.altText}">
      <div class="completion-actions">
        <button class="primary-button" id="again-button" type="button">もう一度あそぶ</button>
        <button class="secondary-button" id="choose-button" type="button">ちがうねこをえらぶ</button>
      </div>
    </section>
  `
  app.querySelector('#again-button').addEventListener('click', showGame)
  app.querySelector('#choose-button').addEventListener('click', showStart)
}

// JSONから猫写真の一覧を読み込み、最初の画面を表示する
const loadCats = async () => {
  try {
    const response = await fetch(publicUrl('data/cat-images.json'))
    if (!response.ok) throw new Error('写真データを読み込めませんでした。')
    cats = (await response.json()).filter((cat) => cat.isEnabled)
      .sort((first, second) => first.sortOrder - second.sortOrder)
    if (!cats.length) throw new Error('表示できる写真がありません。')
    showStart()
  } catch (error) {
    app.innerHTML = `<section class="error"><h1>ごめんなさい</h1><p>${error.message}</p><p>なにか問題が起きているようです</p></section>`
  }
}

loadCats()
