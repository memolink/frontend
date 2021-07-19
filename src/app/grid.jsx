import justifiedLayout from 'justified-layout'
import ky from 'ky'
import $ from 'jquery'
import { FullScreenViewer } from 'iv-viewer'
import 'iv-viewer/dist/iv-viewer.css'

const viewer = new FullScreenViewer()

addHandlers()

function enableVideo(el) {
	console.log(el)
	el.src = el.src.replace('thumb', 'thumbvideo')
}

function disableVideo(el) {
	console.log(el.src)
	el.src = el.src.replace('thumbvideo', 'thumb')
}

function addHandlers() {
	$(document).on('click', '.tile', e => {
		const src = e.target.src
		viewer.show(src, src.replace(/thumb(video)?/, 'photo'))
	})
	$(document).on('keyup', e => {
		if (e.key === 'Escape') viewer.hide()
	})
	// let timer = 0;
	// const TIMEOUT = 3000;

	// $(document).on("mouseenter", ".tile.video", (e) => {
	//   console.log('mouseenter', e.target)
	//   timer = setTimeout(() => {
	//     enableVideo(e.target);
	//   }, TIMEOUT);
	// });

	// $(document).on("mouseleave", ".tile.video", (e) => {
	//   console.log('mouseleave', e.target)
	//   disableVideo(e.target);
	//   clearTimeout(timer);
	// });
}

// app state - list of all sections and their state
const sectionStates = {}

// grid's config - should be updated on viewport resize
const config = {
	containerWidth: window.innerWidth,
	targetRowHeight: 220,
	segmentsMargin: 40,
	sectionMargin: 20,
	searchParams: {},
}

loadUi()

async function getSections() {
	const { searchParams } = config
	const store = await ky.get('/api/search/sections', { searchParams }).json()

	return store.map(({ _id, count }) => {
		return { sectionId: _id, totalImages: count }
	})
}

// get all segments inside one section - e.g. one segment per day
async function getSegments(sectionId) {
	let toDate = new Date(sectionId)
	let fromDate = new Date(sectionId)
	fromDate.setMonth(toDate.getMonth() + 1)

	console.log({ fromDate: fromDate, toDate: toDate })

	fromDate = fromDate.getTime()
	toDate = toDate.getTime()

	const segments = await ky.get('/api/search/photo', { searchParams: { ...config.searchParams, fromDate, toDate } }).json()
	console.log(segments)
	return segments

	//return images.map()
}

function clearUi() {
	document.getElementById('grid').querySelectorAll('.section').forEach(sectionObserver.unobserve.bind(sectionObserver))
}

// gets all sections using api, populates grid div
function loadUi() {
	getSections().then(sections => {
		populateGrid(document.getElementById('grid'), sections)

		// simulating directly jumping to random scroll position
		//window.scrollTo({ top: 10000 });
	})
}

function updateSectionSize(sectionId) {
	console.log('size:', sectionStates[sectionId])
}

function animateScrollbar() {
	const thumbPosition = window.scrollY
	const percent = thumbPosition / document.getElementById('grid').scrollHeight
	const currentSection = Object.entries(sectionStates).find(
		([sectionId, section]) => section.top < thumbPosition && section.top + section.height > thumbPosition
	)
	$('.scrollbar-thumb')
		.css('top', percent * 100 + '%')
		.text(currentSection?.[0] || 'no section')
	window.requestAnimationFrame(animateScrollbar)
}

animateScrollbar()

function addScrollbarListeners() {
	let isMouseDown = false,
		// startPosition = null,
		// currentPosition = null,
		lastUpdateCall = null

	const doAnimation = e => {
		if (lastUpdateCall) cancelAnimationFrame(lastUpdateCall)

		lastUpdateCall = requestAnimationFrame(function () {
			const percent = e.originalEvent.y / document.getElementById('scrollbar').scrollHeight

			window.scrollTo({ top: percent * document.getElementById('grid').scrollHeight })
			console.log(e.originalEvent)
			//console.log(e, e.originalEvent.layerY, document.getElementById('scrollbar').scrollHeight, percent)
			lastUpdateCall = null // Since this frame didn't get cancelled, the lastUpdateCall should be reset so new frames can be called.
		})
	}

	$('#scrollbar').on('mousedown', e => {
		isMouseDown = true
		//startPosition = window.scrollY
		doAnimation(e)
	})

	$(document).on('mouseup', e => (isMouseDown = false))

	$(document).on('mousemove', e => isMouseDown && doAnimation(e))
}

addScrollbarListeners()

// populates grid node with all detached sections
function populateGrid(gridNode, sections) {
	var sectionsHtml = ''
	var prevSectionEnd = config.sectionMargin
	for (const section of sections) {
		sectionStates[section.sectionId] = {
			...section,
			lastUpdateTime: -1,
			height: estimateSectionHeight(section),
			top: prevSectionEnd,
		}

		updateSectionSize(section.sectionId)
		sectionsHtml += getDetachedSectionHtml(sectionStates[section.sectionId])
		prevSectionEnd += sectionStates[section.sectionId].height + config.sectionMargin
	}
	gridNode.innerHTML = sectionsHtml

	// observe each section for intersection with viewport
	gridNode.querySelectorAll('.section').forEach(sectionObserver.observe.bind(sectionObserver))
}

// generates detached section html, detached section has estimated height and no segments loaded
function getDetachedSectionHtml(sectionState) {
	return `<div id="${sectionState.sectionId}" class="section" style="width: ${config.containerWidth}px; height: ${sectionState.height}px; top: ${sectionState.top}px; left: 0px";"></div>`
}

// estimates section height, taken from google photos blog
// Ideally we would use the average aspect ratio for the photoset, however assume
// a normal landscape aspect ratio of 3:2, then discount for the likelihood we
// will be scaling down and coalescing.
function estimateSectionHeight(section) {
	const unwrappedWidth = (3 / 2) * section.totalImages * config.targetRowHeight * (7 / 10)
	const rows = Math.ceil(unwrappedWidth / config.containerWidth)
	const height = rows * config.targetRowHeight

	return height
}

// populates section with actual segments html
function populateSection(sectionDiv, segments) {
	let sectionId = sectionDiv.id
	let segmentsHtml = ''
	let prevSegmentEnd = config.segmentsMargin
	//console.log({ segments })
	for (const segment of segments) {
		const segmentInfo = getSegmentHtmlAndHeight(segment, prevSegmentEnd)
		segmentsHtml += segmentInfo.html
		prevSegmentEnd += segmentInfo.height + config.segmentsMargin
	}

	// add segments to section and calculate new height
	sectionDiv.className = 'section'
	sectionDiv.innerHTML = segmentsHtml
	sectionDiv.querySelectorAll('.tile').forEach(tileObserver.observe.bind(tileObserver))
	const newSectionHeight = prevSegmentEnd
	const oldSectionHeight = sectionStates[sectionId].height

	// adjust all next section's top if height of this section was modified
	const heightDelta = newSectionHeight - oldSectionHeight
	if (heightDelta === 0) return

	sectionStates[sectionId].height = newSectionHeight
	sectionDiv.style.height = `${newSectionHeight}px`
	updateSectionSize(sectionId)

	Object.keys(sectionStates).forEach(sectionToAdjustId => {
		if (new Date(sectionToAdjustId) >= new Date(sectionId)) return

		sectionStates[sectionToAdjustId].top += heightDelta
		const sectionToAdjustDiv = document.getElementById(sectionToAdjustId)
		sectionToAdjustDiv.style.top = `${sectionStates[sectionToAdjustId].top}px`
		updateSectionSize(sectionToAdjustId)
	})

	// adjust scroll if user is scrolling upwords and we loaded some section above current scroll position
	if (window.scrollY > sectionStates[sectionId].top) {
		window.scrollBy(0, heightDelta)
	}
}

// generates Segment html and height
function getSegmentHtmlAndHeight(segment, top) {
	var geometry = justifiedLayout(segment.images, config)

	// gets tiles for each box given by justified layout lib
	var tiles = geometry.boxes
		.map((box, i) => {
			const image = segment.images[i]
			return `<div class="tile" id="${image._id}" data-video="${image.video}" style="width: ${box.width}px; height: ${box.height}px; left: ${box.left}px; top: ${box.top}px;"></div>`
		})
		.join('\n')

	const d = new Date(segment._id)

	const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'full' }).format(d)

	return {
		html: `<div id="${segment._id}" class="segment" style="width: ${config.containerWidth}px; height: ${geometry.containerHeight}px; top: ${top}px; left: 0px;"><div class="header">${date}</div>${tiles}</div>`,
		height: geometry.containerHeight,
	}
}

// detaches section by removing childs of section div and keeping same height
function detachSection(sectionDiv) {
	sectionDiv.innerHTML = ''
	sectionDiv.classList.add('placeholder')
}

const tileObserver = new IntersectionObserver(handleTileIntersection, {
	rootMargin: '200px 0px',
})

// let timer = 0;
// const TIMEOUT = 3000;

// $(document).on("mouseenter", ".tile.video", (e) => {
//   console.log('mouseenter', e.target)
//   timer = setTimeout(() => {
//     enableVideo(e.target);
//   }, TIMEOUT);
// });

// $(document).on("mouseleave", ".tile.video", (e) => {
//   console.log('mouseleave', e.target)
//   disableVideo(e.target);
//   clearTimeout(timer);
// });

const tilesStates = {}

function handleTileIntersection(entries, observer) {
	entries.forEach(entry => {
		const tile = entry.target
		// tilesStates[tileDiv.id] = {
		//   timer: setTimeout(() => {
		//     // enable video
		//   })
		// }
		//${image.video ? `<video autoplay muted loop src="/api/search/thumbvideo/${image._id}" poster="/api/search/thumb/${image._id}">` : `<img src="/api/search/thumb/${image._id}"/>`}
		//sectionStates[sectionDiv.id].lastUpdateTime = entry.time;
		//console.log('tile', entry.isIntersecting, tile)

		if (entry.isIntersecting) {
			tile.innerHTML =
				// tile.dataset.video === 'true'
				// 	? `<video autoplay muted loop src="/api/search/thumbvideo/${tile.id}" poster="/api/search/thumb/${tile.id}">`
				// 	:
				`<img src="/api/search/thumb/${tile.id}"/>`
			//`<img src="https://via.placeholder.com/150x220"/>`
			// getSegments(sectionDiv.id).then(segments => {
			//   window.requestAnimationFrame(() => {
			//     if (sectionStates[sectionDiv.id].lastUpdateTime === entry.time) {
			//       populateSection(sectionDiv, segments);
			//     }
			//   });
			// });
		} else {
			tile.innerHTML = '' //`<img src="/api/search/thumb/${tile.id}"/>`
			// window.requestAnimationFrame(() => {
			//   if (sectionStates[sectionDiv.id].lastUpdateTime === entry.time) {
			//     detachSection(sectionDiv, entry.time)
			//   }
			// });
		}
	})
}

const sectionObserver = new IntersectionObserver(handleSectionIntersection, {
	rootMargin: '200px 0px',
})

// handle when there is change for section intersecting viewport
function handleSectionIntersection(entries, observer) {
	// const intersecting = entries.filter(entry => entry.isIntersecting).map(({ target }) => target)
	// const notIntersecting = entries.filter(entry => !entry.isIntersecting).map(({ target }) => target)
	// console.log(intersecting, notIntersecting)

	entries.forEach(entry => {
		const sectionDiv = entry.target
		sectionStates[sectionDiv.id].lastUpdateTime = entry.time

		if (entry.isIntersecting) {
			getSegments(sectionDiv.id).then(segments => {
				window.requestAnimationFrame(() => {
					if (sectionStates[sectionDiv.id].lastUpdateTime === entry.time) {
						populateSection(sectionDiv, segments)
					}
				})
			})
		} else {
			window.requestAnimationFrame(() => {
				if (sectionStates[sectionDiv.id].lastUpdateTime === entry.time) {
					detachSection(sectionDiv, entry.time)
				}
			})
		}
	})
}

export default {
	setOptions: options => {
		config.searchParams = options

		clearUi()
		loadUi()
	},
}
