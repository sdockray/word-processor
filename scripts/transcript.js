class Transcript {
    constructor() {
        this.docId = ''
        this.url = ''
        this.segments = []
        this.audioSegments = {}
    }

    load(url, onload) {
        const that = this
        $.getJSON(url, function(json) {
        console.log(json)
           that.segments = json.segments
           this.audioSegments = {}
           onload()
        })
    }

    async loadReduct(id, onload) {
        const json = await (await fetch(`diarized_transcript.json?doc=${id}&phonemes=1`)).json()
        this.segments = json.segments
        this.audioSegments = {}
        console.log(this.segments.length)
        onload()
        this.downloadSegmentMedia('0', 'wav')
    }

    loadLocalAudio(sampler, start, end, baseDir) {
        sampler.add(baseDir + "/" + start + ".mp4", start+'-'+end, start+'-'+end)
    }

    addMediaSpec(spec, curT, docId, mediaId, start, end) {
        const dur = end - start
        spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: dur, source_start: start, type: 'video', opacity: [[0,1]]})
        spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: dur, source_start: start, type: 'audio', volume: [[0,0], [.1,1], [dur,1], [dur+.2,0]]})
        return dur
    }

    getMediaHeaders(spec, duration, codec) {
        const pre_padding = 0.1
        const post_padding = (codec=='wav') ? .1 : .1
        return {
            method: 'post',
            headers: {
                "X-Using-Reduct-Fetch": "true",
            },
            body: JSON.stringify({
                org: orgId,
                seq: spec,
                duration: duration,
                size: 240,
                pre_padding: pre_padding,
                post_padding: post_padding,
                codec: codec
            })
        }
    }

    async loadMediaSequence(sampler, mix, start, end, codec) {
        let spec = []
        let curT = 0
        let pause = .4
        for (const mixWord of mix) {
            for (const m of mixWord) {
                curT += this.addMediaSpec(spec, curT, m[0], m[1], m[2], m[3])
            }
            curT += pause
        }
        const headers = this.getMediaHeaders(spec, curT, codec)
        return sampler.addFetch('/render', headers, start+'-'+end, start+'-'+end)
    }

    async loadMedia(sampler, docId, mediaId, start, end, codec, mix) {
        if (mix && mix.length>0) {
            return this.loadMediaSequence(sampler, mix, start, end, codec)
        } else {
            let spec = []
            let curT = this.addMediaSpec(spec, 0, docId, mediaId, start, end)
            let headers = this.getMediaHeaders(spec, curT, codec)
            // const sampler = new Sampler()
            return sampler.addFetch('/render', headers, start+'-'+end, start+'-'+end)
            //.then(sample => {
            //    sample.loop()
            //    sample.play()
            //})
        //}
        }
    }

    // Downloads media and converts to blob
    async downloadMedia(headers, codec) {
        return fetch('/render', headers)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            const blob = new Blob([arrayBuffer], {type: "video/" + codec})
            return URL.createObjectURL(blob)
        })
        .catch(console.log)
    }    

    // Downloads segment media and converts to blob 
    async downloadSegmentMedia(sidx, codec) {
        if (this.audioSegments.hasOwnProperty(sidx)) {
            console.log(`Loading segment ${sidx} from cache`)
            return this.audioSegments[sidx]
        } else if (sidx < this.segments.length) {
            const segment = this.segments[sidx]
            const mediaId = segment.media_id
            let spec = []
            let curT = 0
            spec.push({dbpath: ['doc', this.docId, 'media', mediaId, 'blob_name'], start: curT, duration: segment.end-segment.start, source_start: segment.start, type: 'video', opacity: [[0,1]]})
            spec.push({dbpath: ['doc', this.docId, 'media', mediaId, 'blob_name'], start: curT, duration: segment.end-segment.start, source_start: segment.start, type: 'audio', volume: [[0,1]]})
            curT += segment.end - segment.start
            console.log(`Requesting segment ${sidx} with duration ${curT}`)
            const headers = this.getMediaHeaders(spec, curT, codec)
            const url = await this.downloadMedia(headers, codec)
            this.audioSegments[sidx] = url
            return url            
        } else {
            console.log(`${sidx} is after the end of ${this.segments.length} segments`)
        }
    } 

    // Downloads file in browser for user
    async downloadMediaFile(headers, codec) {
        return this.downloadMedia(headers, codec)
        .then(url => {
            var a = document.createElement('a')
            a.href = url
            a.download = "download." + codec
            document.body.appendChild(a)
            a.click()
            a.remove()
        })
        .catch(console.log)
    }

    findPhonemeRun(phones) {
        const findOverlap = (a, b) => {
            if (b.length === 0) {
                return ""
            }
            if (a.endsWith(b)) {
                return b
            }
            if (a.indexOf(b) >= 0) {
                return b
            }
            return findOverlap(a, b.substring(0, b.length - 1))
        }
        //mediaId: segment.media_id,
        //const docId = this.docId
        const phonesStr = phones.join('-')
        let phonesMap = Object.fromEntries(phones.map(p => [p, []]))
        let runs = []
        for (const s of this.segments) {
            for (const w of s.wdlist) {
                const phonesStr2 = w.phones.map(p => p[0]).join('-')
                const overlap = findOverlap(phonesStr, phonesStr2).replace(/^\-+|\-+$/g, '')
                const overlapArr = overlap.split('-')
                if (overlapArr.length>1) {
                    let idx = 0
                    let start = w.start
                    let dur = 0
                    for (const p of w.phones) {
                        if (p[0]==overlapArr[idx]) {
                            if (idx === 0) {
                                start = w.start + dur
                            }
                            idx += 1
                        }
                        dur += p[1]
                        if (idx >= overlapArr.length) {
                            break
                        }
                    }
                    const runData = [s.media_id, this.docId, start, dur, overlapArr.length, overlap, w.word]
                    runs.push(runData)
                }
                let phoneStart = w.start
                for (const p of w.phones) {
                    if (phonesMap.hasOwnProperty(p[0])) {
                        //if (phonesMap[p[0]].length === 0 || p[1] > phonesMap[p[0]][3]) {
                        if (phonesMap[p[0]].length === 0 || p[1] > .05) {
                            phonesMap[p[0]].push([s.media_id, this.docId, phoneStart, p[1]])
                            //phonesMap[p[0]] = [s.media_id, this.docId, phoneStart, p[1]]
                            break
                        }
                    }
                    phoneStart += p[1]
                }
            }
        }
        let phonesLeft = phonesStr
        let usedRuns = {}
        for (const run of runs.sort((a,b) => { return b[4] == a[4] ? b[5].length - a[5].length : b[4] - a[4] })) {
            //console.log(phonesLeft, run[1])
            if (`-${phonesLeft}-`.indexOf(`-${run[5]}-`) !== -1) {
                phonesLeft = phonesLeft.replace(run[5], '')
                usedRuns[run[5]] = runs.filter(r => r[5]==run[5])
            }
        }
        let singlePhones = {}
        if (phonesLeft) {
            singlePhones = Object.fromEntries(phonesLeft.replace(/^\-+|\-+$/g, '').split('-').map(p => [p, phonesMap[p]]))
        }
        const pickBest = () => {
            for (const [phoneSeq, runs] of Object.entries(usedRuns)) {
                if (strLeft.startsWith(phoneSeq)) {
                    return [runs[Math.floor(Math.random()*runs.length)], phoneSeq]
                }
            }
            const aPhone = strLeft.indexOf('-') > 0 ? strLeft.slice(0, strLeft.indexOf('-')) : strLeft
            //return [singlePhones[aPhone], aPhone]
            return [singlePhones[aPhone][Math.floor(Math.random()*singlePhones[aPhone].length)], aPhone]
        }
        let retArr = []
        let strLeft = phonesStr
        let count = 0
        while (strLeft.length>0 && count<100) {
            const best = pickBest(strLeft)    
            retArr.push(best[0])
            strLeft = strLeft.slice(best[1].length + 1)
            count +=1 
        }
        return retArr
    }

}


class TranscriptInterface {
    constructor($parent) {
        this.transcript = new Transcript()
        this.sequencer = new Sequencer()
        this.$parent = $parent
        this.$transcript = $("<div>") 
        this.$audio = $("<audio>").addClass('u-none')
        this.playableTranscript = false // this is for playing segments of an original transcript
        this.$parent.append(this.$transcript)
        this.$parent.append(this.$audio)
        this.isActive = false
        // on filters and sorts
        this.$transcript.on("sequenceUpdated", () => {
            this.playableTranscript = false
            this.$audio.get(0).pause()
            this.getCurrentSequence(false)
        })
        // need to keep this globally
        this.nounPhrases = []
    }

    empty() {
        this.$transcript.empty()
        this.sequencer.empty()
    }

    inventPhrase(phrase) {
        const pause = 0.4
        const that = this
        const words = phrase.trim().split('.').map(w => w.trim().split(' ').map(p => p.trim().toLowerCase())).filter(w => w[0]!="")
        let mix = []
        let start = 0
        let dur = 0
        for (const word of words) {
            let mixWord = []
            const phones = this.transcript.findPhonemeRun(word)
            for (const p in phones) {
                mixWord.push([phones[p][1], phones[p][0], phones[p][2], phones[p][2]+phones[p][3]])
                start = start | phones[p][2]
                dur += phones[p][3]
            }
            mix.push(mixWord)
            dur += pause
        }
        const $w = this.makeWord({
            display: phrase,
            start: start,
            end: dur,
            start2: 0,
            word: phrase,
            oWord: phrase,
            phones: [],
            mediaId: '',
            docId: '',
            pos: [],
            mix: mix
        })
        $w.addClass('selected')
        this.$transcript.prepend($w)
    }

    loadTranscript(id, url) {
        this.transcript.docId = id
        if (url) {
            this.transcript.load(url, () => {
                this.render()
            })
        } else {
            this.transcript.loadReduct(id, () => {
                this.render()
                this.addPlayButton()
            })
        }
    }

    addPlayButton() {
        this.playableTranscript = true
        const $button = $('<button>').addClass("form-group-btn btn-primary btn-xsmall bg-gray-400").text('listen')
        $button.on('click', () => {
            if ($button.hasClass('playing')) {
                $button.removeClass('playing')
                this.pauseTranscript()
            } else if (this.$audio.hasClass('paused')) {
                $button.addClass('playing')
                this.pauseTranscript()
            } else {
                $button.addClass('playing')
                this.playTranscript(0)
            }
        })
        this.$transcript.on('sequenceUpdated', () => {
            this.pauseTranscript()
            $button.hide()
        })
        this.$transcript.append($button)
    }

    reloadTranscript() {
        //this.$transcript.empty()
        //this.render() 
        this.$transcript.find('.w')
            .removeClass('selected')
            .show()
    }

    pauseTranscript() {
        if (this.$audio.hasClass('playing')) {
            const a = this.$audio.get(0)
            a.pause()
            this.$audio.addClass('paused')
            this.$audio.removeClass('playing')
            return
        } else if (this.$audio.hasClass('paused')) {
            const a = this.$audio.get(0)
            a.play()
            this.$audio.removeClass('paused')
            this.$audio.addClass('playing')
        }
    }

    async playTranscript(idx) {
        if (this.playableTranscript) {
            const a = this.$audio.get(0)
            a.pause()
            const url = await this.transcript.downloadSegmentMedia(idx, 'wav')
            a.src = url
            a.ontimeupdate = (event) => {}
            a.onplay = (event) => {
                this.transcript.downloadSegmentMedia(idx + 1, 'wav')
            }
            a.onended = (event) => {
                this.$audio.removeClass('playing')
                this.playTranscript(idx + 1)
            }
            a.play()
            this.$audio.addClass('playing')
            this.$audio.removeClass('paused')
        } else if (this.$audio.hasClass('playing')) {
            this.pauseTranscript()
            return
        }
    }

    async playTranscriptSegment($p, $w) {
        if (this.playableTranscript) {
            const a = this.$audio.get(0)
            a.pause()
            const url = await this.transcript.downloadSegmentMedia($p.data('id'), 'wav')
            a.src = url
            a.currentTime = $w.data('start2')
            let $w2 = $w
            $w2.addClass('ph')
            a.ontimeupdate = (event) => {
                if (a.currentTime > $w2.data('start2') + $w2.data('end') - $w2.data('start')) {
                    $w2.removeClass('ph')
                    $w2 = $w2.next()
                    $w2.addClass('ph')
                }
            }
            a.play()
        }
    }

    makePhrase($wordsIn) {
        const $words = $wordsIn.filter(word => word.data() !== null).filter(word => !word.data('pos').includes('Sound'))
        const end = $words[$words.length - 1].data('end')
        const allWords = $words.map(x => x.text()).join('')
        const allWords2 = $words.map(x => x.data('word')).join(' ')
        // const phones = [].concat.apply([], $words.map(x => x.data('phones').map(p => p[0])))
        const phones = [].concat.apply([], $words.map(x => x.data('phones').map(p => p)))
        $words[0].text(allWords)
        $words[0].data('word', allWords2)
        $words[0].data('end', end)
        $words[0].data('phones', phones)
        $words[0].data('pos', ['#Phrase'])
        for (let i=1; i<$words.length; i++) {
            $words[i].hide()
        }
    }

    // Filter, but a sequence of words must all match
    filter_sequence(filterFunc, targetLength) {
        if (!this.isActive) {
            return false
        }
        // this.filter(filterFunc, leadingTrailing)
        const visibleWords = this.$transcript.find('.w:visible')
        let speed = Math.round(2000/visibleWords.length)+2
        const that = this
        let candidate = []
        let phrases = []
        $.each(visibleWords, function (index, item) {
            if (filterFunc($(item), candidate.length)) {
                candidate.push($(item))
            } else {
                candidate = []
            }
            if (candidate.length == targetLength) {
                $.each(candidate, function (index, item) {
                    item.addClass('select')
                })
                phrases.push(candidate)
                candidate = []
            }
        })
        $.each(visibleWords, function (index, item) {
            if (index > 200) {
                speed = 0
            }
            if (!$(item).hasClass('select')) {
                setTimeout(() => {
                    $(item).fadeOut("slow")
                }, index*speed)
            } else {
                setTimeout(() => {
                    $(item).removeClass('select')
                    $(item).addClass('selected')
                    //that.transcript.loadAudio(that.sequencer.sampler, $(item).data('docId'), $(item).data('mediaId'), $(item).data('start'), $(item).data('end')).then(sample => sample.play())
                }, index*speed)
            }
        })
        $.each(phrases, function (index, item) {
            that.makePhrase(item)
        })
        this.$transcript.trigger("sequenceUpdated")
    }

    trigger(event, params) {
        if (!this.isActive) {
            return false
        }
        const visibleWords = this.$transcript.find('.w:visible')
        visibleWords.trigger(event, params)
    }

    isEndOfSentence(word) {
        if (word && word.length) {
            const lastLetter = word.charAt(word.length - 2)
            return (lastLetter=='.' || lastLetter=='?' || lastLetter=='!')
        } else {
            return false
        }
    }

    removeUnselectedWords(words) {
        let speed = Math.round(2000/words.length)+2
        $.each(words, function (index, item) {
            if (!$(item).hasClass('select')) {
                if (index<200) {
                    setTimeout(() => {
                        $(item).fadeOut("slow")
                        //$(item).wrap('<del/>')
                    }, index*speed)
                } else {
                    $(item).hide()
                }
            } else {
                if (index<200) {
                    setTimeout(() => {
                        $(item).removeClass('select')
                        $(item).addClass('selected')
                        //$(item).wrap('<mark/>')
                        //that.transcript.loadAudio(that.sequencer.sampler, $(item).data('docId'), $(item).data('mediaId'), $(item).data('start'), $(item).data('end')).then(sample => sample.play())
                    }, index*speed)
                } else {
                    $(item).removeClass('select')
                    $(item).addClass('selected')
                }
            }
        })
    }

    filter(filterFunc, keep=1, leadingTrailing=[0,0]) {
        if (!this.isActive) {
            return false
        }
        const tn = Date.now()
        const visibleWords = this.$transcript.find('.w:visible')
        // const speed = 2
        const that = this
        let phrases = []
        $.each(visibleWords, function (index, item) {
            const r = filterFunc($(item))
            if ( r == keep ) {// !XOR
                let words = [$(item)]
                $(item).addClass('select')
                let $i = $(item)
                let keepGoing = true
                Array.from(Array(leadingTrailing[0])).map((_) => {
                    $i = $i.prev()
                    if (that.isEndOfSentence($i.data('oWord'))) {
                        keepGoing = false
                    }
                    if (keepGoing) {
                        $i.addClass('select')
                        words.push($i)
                    }
                })
                $i = $(item)
                keepGoing = !that.isEndOfSentence($i.data('oWord'))
                Array.from(Array(leadingTrailing[1])).map((_) => {
                    $i = $i.next()
                    if (keepGoing) {
                        $i.addClass('select')
                        words.push($i)
                    }
                    if (that.isEndOfSentence($i.data('oWord'))) {
                        keepGoing = false
                    }
                })
                if (words.length > 1) {
                    phrases.push(words.sort((a,b) => a.data('start') > b.data('start')))
                }
            }
        })
        this.removeUnselectedWords(visibleWords)
        $.each(phrases, function (index, item) {
            that.makePhrase(item)
        })
        this.$transcript.trigger("sequenceUpdated")
    }

    filterNounPhrases() {
        const visibleWords = this.$transcript.find('.w:visible')
        $.each(this.nounPhrases, function (index, item) {
            $.each(item, (index, $w) => $w.addClass('select'))
        })
        this.removeUnselectedWords(visibleWords)
        $.each(this.nounPhrases, (index, item) => this.makePhrase(item))
    }

    sort(sortFunc) {
        if (!this.isActive) {
            return false
        }
        this.$transcript.find('.w:visible').sort((a, b) => sortFunc($(a),$(b)))
        .appendTo(this.$transcript)
        this.$transcript.trigger("sequenceUpdated")
    }

    commonWords(num) {
        const occurrences = this.$transcript.find('.w:visible').toArray().reduce(function (acc, item) {
            const curr = $(item).data('word')
            return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc
        }, {})
        return Object.keys(occurrences).sort(function(a,b){return occurrences[b]-occurrences[a]}).slice(0,num)
    }

    getCurrentSequence(play) {
        let newSequence = []
        $.each(this.$transcript.find('.w:visible'), function(index, item) {
            newSequence.push($(item).data('start')+'-'+$(item).data('end'))
        })
        this.sequencer.set(newSequence)
        if (play) {
            this.sequencer.play()
        }
        return newSequence
    }

    loadVideoClips() {
        const that = this
        this.sequencer.useSampler('video')
        $.each(this.$transcript.find('.w').not('.v-loaded'), function(index, item) {
            const $w = $(item)
            that.transcript.loadMedia(that.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'), 'mp4').then(sample => {
                sample.setElement($w)
                $w.addClass('v-loaded')
            })
        })
    }

    addRenderedWord($w) {
        const that = this
        this.$transcript.append($w).removeClass('selected')
        // const end = $w.data('start') + $w.data('phones').map(p => p[1]).reduce((a, b, i) => (i <= 1) ? a + b: a )
        this.transcript.loadMedia(this.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'), 'wav', $w.data('mix')).then(sample => {
            //sample.on('starting', console.log('XXX STARTING XXX'));
            sample.setElement($w)
            $w.addClass('loaded')
        })
        $w.on('mousedown', () => {
            that.$parent.trigger("wordSelected", [$w])
        })
    }

    makeWord(opt) {
        const that = this
        const $w = $("<span>").addClass('w').text(opt.display).data({
            start: opt.start,
            end: opt.end,
            start2: opt.start2,
            sidx: opt.sidx,
            word: opt.word,
            oWord: opt.oWord,
            phones: opt.phones,
            mediaId: opt.mediaId,
            docId: opt.docId,
            pos: opt.pos,
            mix: opt.mix
        })
        $w.on('mousedown', () => {
            that.$parent.trigger("wordSelected", [$w])
            $w.toggleClass('selected')
            that.transcript.loadMedia(that.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'), 'wav', $w.data('mix')).then(sample => {
                //sample.on('starting', console.log('XXX STARTING XXX'));
                sample.setElement($w)
                $w.addClass('loaded')
                if (opt.hasOwnProperty('span') && opt.span.length==2) {
                    sample.setSpan(opt.span[0], opt.span[1])
                }
            })
        })
        return $w
    }

    async renderWords(wdlist, segment, $parent) {
        const that = this
        const regex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ ]/g
        const [pos, nps] = await cheap_nlp(wdlist.map(w => w.word).join(''))
        let idx = 0
        let sidx = 1
        let sentStart = segment.start
        let lastEnd = segment.start
        let currNP = []
        let npIdx = 0
        for (let wd of wdlist) {
            // console.log(wd)
            // Add a sound if the gap is longer than a second
            if (wd.start > lastEnd + 1) {
                const cleanWord = '['+ '.'.repeat(Math.round((wd.start - lastEnd)*3)) + ']'
                const $w = this.makeWord({
                    display: cleanWord,
                    start: lastEnd,
                    end: wd.start,
                    start2: wd.start - sentStart,
                    sidx: sidx,
                    word: cleanWord,
                    oWord: false,
                    phones: [],
                    mediaId: segment.media_id,
                    docId: this.transcript.docId,
                    pos: ['Sound']
                })
                $parent.append($w)
            }

            lastEnd = wd.end
            const cleanWord = wd.word.replace(regex, '').toLowerCase()
            const $w = this.makeWord({
                display: wd.word,
                start: wd.start,
                end: wd.end,
                start2: wd.start - sentStart,
                sidx: sidx,
                word: cleanWord,
                oWord: wd.word,
                phones: wd.phones,
                mediaId: segment.media_id,
                docId: this.transcript.docId,
                pos: (idx < pos.length && pos[idx].hasOwnProperty(cleanWord)) ? pos[idx][cleanWord] : []
            })
            sidx += 1
            $parent.append($w)
            if (nps.length>0 && npIdx<nps.length && nps[npIdx][currNP.length]===wd.word.trim()) {
                currNP.push($w)
                if (currNP.length === nps[npIdx].length) {
                    this.nounPhrases.push(currNP)
                    currNP = []
                    npIdx += 1
                }
            } else if (currNP.length>0) {
                currNP = []
            }
            const lastLetter = wd.word.charAt(wd.word.length - 2)
            if (lastLetter=='.' || lastLetter=='?' || lastLetter=='!') {
                idx += 1
                sidx = 1
                sentStart = wd.end
            }
        }
    }

    async render() {
        this.nounPhrases = []
        const renderSegment = (s, sidx) => {
            const $p = $("<p>").data({ id: sidx })
            this.renderWords(s.wdlist, s, $p)
            this.$transcript.append($p)
        }
        for (const [sidx, s] of this.transcript.segments.entries()) {
            setTimeout(() => {
                renderSegment(s, sidx)
            }, 20)
        }
    }

    async download(bpm) {
        const that = this
        const codec = this.sequencer.sampler.preferredCodec
        // this.sequencer.useSampler('video')
        // @TODO: actually use the sequencer interval rather than just bpm
        let spec = []
        let curT = 0
        if (bpm === 0) {
            $.each(this.$transcript.find('.w:visible'), function(index, item) {
                const $w = $(item)
                curT += that.transcript.addMediaSpec(spec, curT, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'))
                //that.transcript.formulateMediaRequest(that.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'), codec)
            })
        } else {
            const timeStep = 60/bpm
            const offset = this.sequencer.offset/1000
            curT = offset
            $.each(this.$transcript.find('.w:visible'), function(index, item) {
                const $w = $(item)
                const wordDur = $w.data('end') - $w.data('start')
                const clipDur = (wordDur<=timeStep) ? wordDur : timeStep
                const nextStart = curT + timeStep
                that.transcript.addMediaSpec(spec, curT, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('start')+clipDur)
                curT = nextStart
            })
        }
        const headers = this.transcript.getMediaHeaders(spec, curT, codec)
        // now fetch!
        await this.transcript.downloadMediaFile(headers, codec)
    }


}

async function cheap_nlp(sentence) {
    const regex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ ]/g
    let doc = nlp(sentence)
    //console.log(doc.nouns().list.map(a => a.text()).filter(a => a.indexOf(' ') < a.length-1))
    //return [doc.out('tags'), doc.nouns().list.filter(a => a.length>1).map(a => a.text().trim().split(' '))]
    return [doc.out('tags'), doc.nouns().out('array').filter(a => a.length>1).map(a => a.text().trim().split(' '))]
}