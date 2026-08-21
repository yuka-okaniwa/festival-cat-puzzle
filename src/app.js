const app = document.querySelector('#app')
const gridColumns = 4
const gridRows = 3
const pieceCount = gridColumns * gridRows
let cats = []
let selectedCat = null
let activeDrag = null
let lastTouchedTimer = null

// 猫のデータから、画面に表示する画像のURLを作る
const imageUrl = (cat) => `/public/images/cat-images/${cat.fileName}`

// 配列の要素をランダムな順番に並べ替えた新しい配列を返す
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

// 猫写真を選ぶ最初の画面を表示する
const showStart = () => {
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
    <button class="primary-button" id="start-button" type="button">このねこで はじめる</button>
  `
  app.querySelectorAll('[name="selected-cat"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      selectedCat = cats.find((cat) => cat.id === radio.value)
      showStart()
    })
  })
  app.querySelector('#start-button').addEventListener('click', showGame)
}

// 指定した番号の写真部分を表示する、ドラッグ可能なピースを作る
const createPiece = (pieceIndex) => {
  const row = Math.floor(pieceIndex / gridColumns)
  const column = pieceIndex % gridColumns
  const piece = document.createElement('button')
  piece.type = 'button'
  piece.className = 'piece'
  piece.dataset.pieceIndex = String(pieceIndex)
  piece.setAttribute('aria-label', `パズルのピース ${pieceIndex + 1}`)
  piece.style.setProperty('--photo-url', `url("${imageUrl(selectedCat)}")`)
  piece.style.setProperty('--background-position', `${(column / (gridColumns - 1)) * 100}% ${(row / (gridRows - 1)) * 100}%`)
  piece.style.setProperty('--background-size', `${gridColumns * 100}% ${gridRows * 100}%`)
  piece.addEventListener('pointerdown', startDrag)
  return piece
}

// 選んだ猫写真を使い、盤面とピース置き場を表示する
const showGame = () => {
  activeDrag = null
  app.innerHTML = `
    <div class="game-toolbar">
      <h1>${selectedCat.title}のパズル</h1>
      <button class="secondary-button" id="back-button" type="button">ねこをえらぶ</button>
    </div>
    <div class="game-layout">
      <section class="board-area">
        <h2>ここに おこう</h2>
        <p class="hint">ピースをドラッグして、おなじばしょに おこう！</p>
        <div class="board" id="board" style="--photo-url: url('${imageUrl(selectedCat)}')"></div>
      </section>
      <section class="tray-area">
        <h2>ピース</h2>
        <p class="hint">すきなピースから はじめよう</p>
        <div class="tray" id="tray" aria-label="パズルのピース置き場"></div>
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
  // ポインターを捕捉しているピースで終了イベントを受け取る。
  // window のイベントより先に lostpointercapture が発生する環境でも、
  // 置き場所の判定を終えてからドラッグ状態を消せるようにする。
  piece.addEventListener('pointerup', finishDrag, { once: true })
  piece.addEventListener('pointercancel', clearDrag, { once: true })
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
  const target = findNearestSlot(event.clientX, event.clientY)
  const isCorrectSlot = target && !target.classList.contains('is-filled')
    && Number(target.dataset.slotIndex) === Number(piece.dataset.pieceIndex)
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
  if (app.querySelectorAll('.slot.is-filled').length === pieceCount) showComplete()
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

// 盤面内で最も中心に近い枠を、ピースを置く候補として返す
const findNearestSlot = (x, y) => {
  const board = app.querySelector('#board')
  const boardRect = board.getBoundingClientRect()
  const isOutsideBoard = x < boardRect.left || x > boardRect.right
    || y < boardRect.top || y > boardRect.bottom
  if (isOutsideBoard) return null

  return Array.from(board.querySelectorAll('.slot')).reduce((nearestSlot, slot) => {
    const nearestRect = nearestSlot.getBoundingClientRect()
    const slotRect = slot.getBoundingClientRect()
    const nearestDistance = (x - (nearestRect.left + nearestRect.width / 2)) ** 2
      + (y - (nearestRect.top + nearestRect.height / 2)) ** 2
    const slotDistance = (x - (slotRect.left + slotRect.width / 2)) ** 2
      + (y - (slotRect.top + slotRect.height / 2)) ** 2
    return slotDistance < nearestDistance ? slot : nearestSlot
  })
}

// ドラッグ用プレビューを消し、ドラッグ中の状態を終了する
const clearDrag = () => {
  if (activeDrag) {
    activeDrag.piece.removeEventListener('pointermove', movePreview)
    activeDrag.piece.removeEventListener('pointerup', finishDrag)
    activeDrag.piece.removeEventListener('pointercancel', clearDrag)
    activeDrag.piece.classList.remove('is-source')
  }
  document.querySelectorAll('.drag-preview').forEach((preview) => preview.remove())
  activeDrag = null
}

// すべてのピースが正しい場所に置かれたとき、完成画面を表示する
const showComplete = () => {
  activeDrag = null
  app.innerHTML = `
    <section class="completion">
      <h1>かんせい！</h1>
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
    const response = await fetch('/public/data/cat-images.json')
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
