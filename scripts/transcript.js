class Transcript {
    constructor() {
        this.docId = ''
        this.url = ''
        this.segments = []
    }

    load(url, onload) {
        const that = this
        $.getJSON(url, function(json) {
        console.log(json)
           that.segments = json.segments
           onload()
        })
    }

    async loadReduct(id, onload) {
        const json = await (await fetch(`diarized_transcript.json?doc=${id}&phonemes=1`)).json()
        this.segments = json.segments
        console.log(this.segments.length)
        onload()
    }

    loadLocalAudio(sampler, start, end, baseDir) {
        sampler.add(baseDir + "/" + start + ".mp4", start+'-'+end, start+'-'+end)
    }

    async loadSegmentAudio(sampler, segment) {
        const mediaId = segment.media_id
        let spec = []
        let curT = 0
        spec.push({dbpath: ['doc', this.docId, 'media', mediaId, 'blob_name'], start: curT, duration: segment.end-segment.start, source_start: segment.start, type: 'video', opacity: [[0,1]]})
        spec.push({dbpath: ['doc', this.docId, 'media', mediaId, 'blob_name'], start: curT, duration: segment.end-segment.start, source_start: segment.start, type: 'audio', volume: [[0,1]]})
        curT += segment.end - segment.start
        // const sampler = new Sampler()
        let parts = []
        let lastWord = false
        for (let wd of segment.wdlist) {
            if (lastWord) {
                parts.push({
                    idx: lastWord.start +"-"+ lastWord.end,
                    label: lastWord.word,
                    start: lastWord.start - segment.start,
                    duration: wd.start - lastWord.start
                })
            }
            lastWord = wd
        }
        parts.push({
            idx: lastWord.start +"-"+ lastWord.end,
            label: lastWord.word,
            start: lastWord.start - segment.start,
            duration: lastWord.end - lastWord.start
        })
        sampler.addFetch('/render', {
            method: 'post',
            headers: {
                "X-Using-Reduct-Fetch": "true",
            },
            body: JSON.stringify({
                org: orgId,
                seq: spec,
                duration: curT,
                size: 240,
                ext: 'mp4'
            })
        }, parts, false)
    }

    addMediaSpec(spec, curT, docId, mediaId, start, end) {
        const dur = end - start
        spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: dur, source_start: start, type: 'video', opacity: [[0,1]]})
        spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: dur, source_start: start, type: 'audio', volume: [[0,1]]})
        return dur
    }

    getMediaHeaders(spec, duration, codec) {
        const pre_padding = 0.05
        const post_padding = (codec=='wav') ? 0 : .05
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

    async loadMedia(sampler, docId, mediaId, start, end, codec) {
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

    async downloadMedia(headers, codec) {
        return fetch('/render', headers)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                const blob = new Blob([arrayBuffer], {type: "video/" + codec})
                return URL.createObjectURL(blob)
            })
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
}


class TranscriptInterface {
    constructor($parent) {
        this.transcript = new Transcript()
        this.sequencer = new Sequencer()
        this.$parent = $parent
        this.$transcript = $("<div>") 
        this.$parent.append(this.$transcript)
        this.isActive = false
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
            })
        }
    }

    makePhrase($words) {
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
    }

    trigger(event, params) {
        if (!this.isActive) {
            return false
        }
        const visibleWords = this.$transcript.find('.w:visible')
        visibleWords.trigger(event, params)
    }

    filter(filterFunc, keep=1, leadingTrailing=[0,0]) {
        if (!this.isActive) {
            return false
        }
        const visibleWords = this.$transcript.find('.w:visible')
        let speed = Math.round(2000/visibleWords.length)+2
        // const speed = 2
        const that = this
        let phrases = []
        $.each(visibleWords, function (index, item) {
            const r = filterFunc($(item))
            if ( r == keep ) {// !XOR
                let words = [$(item)]
                $(item).addClass('select')
                let $i = $(item)
                Array.from(Array(leadingTrailing[0])).map((_) => {
                    $i = $i.prev()
                    $i.addClass('select')
                    words.push($i)
                })
                $i = $(item)
                Array.from(Array(leadingTrailing[1])).map((_) => {
                    $i = $i.next()
                    $i.addClass('select')
                    words.push($i)
                })
                if (words.length > 1) {
                    phrases.push(words.sort((a,b) => a.data('start') > b.data('start')))
                }
            }
        })
        $.each(visibleWords, function (index, item) {
            if (!$(item).hasClass('select')) {
                setTimeout(() => {
                    $(item).fadeOut("slow")
                    //$(item).wrap('<del/>')
                }, index*speed)
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
        $.each(phrases, function (index, item) {
            that.makePhrase(item)
        })
    }

    sort(sortFunc) {
        if (!this.isActive) {
            return false
        }
        this.$transcript.find('.w').sort((a, b) => sortFunc($(a),$(b)))
        .appendTo(this.$transcript)
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
        this.transcript.loadMedia(this.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'), 'wav').then(sample => {
            //sample.on('starting', console.log('XXX STARTING XXX'));
            sample.setElement($w)
            $w.addClass('loaded')
        })
        $w.on('mousedown', () => {
            that.$parent.trigger("wordSelected", [$w])
        })
    }

    async renderWords(wdlist, segment, $parent) {
        const that = this
        const regex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~ ]/g
        // this.transcript.loadSegmentAudio(this.sequencer.sampler, segment)
        const pos = await cheap_nlp(wdlist.map(w => w.word).join(''))
        let idx = 0
        let lastEnd = segment.start
        const makeWord = (opt) => {
            const $w = $("<span>").addClass('w').text(opt.display).data({
                start: opt.start,
                end: opt.end,
                start2: opt.start2,
                word: opt.word,
                oWord: opt.oWord,
                phones: opt.phones,
                mediaId: opt.mediaId,
                docId: opt.docId,
                pos: opt.pos
            })
            $w.on('mousedown', () => {
                that.$parent.trigger("wordSelected", [$w])
                $w.toggleClass('selected')
            })
            $parent.append($w)
        }
        for (let wd of wdlist) {
            // console.log(wd)
            // Add a sound if the gap is longer than a second
            if (wd.start > lastEnd + 1) {
                const cleanWord = '['+ '.'.repeat(Math.round((wd.start - lastEnd)*3)) + ']'
                makeWord({
                    display: cleanWord,
                    start: lastEnd,
                    end: wd.start,
                    start2: wd.start - segment.start,
                    word: cleanWord,
                    oWord: false,
                    phones: [],
                    mediaId: segment.media_id,
                    docId: this.transcript.docId,
                    pos: ['Sound']
                })
            }

            lastEnd = wd.end
            const cleanWord = wd.word.replace(regex, '').toLowerCase()
            makeWord({
                display: wd.word,
                start: wd.start,
                end: wd.end,
                start2: wd.start - segment.start,
                word: cleanWord,
                oWord: wd.word,
                phones: wd.phones,
                mediaId: segment.media_id,
                docId: this.transcript.docId,
                pos: (idx < pos.length && pos[idx].hasOwnProperty(cleanWord)) ? pos[idx][cleanWord] : []
            })
            
            const lastLetter = wd.word.charAt(wd.word.length - 2)
            if (lastLetter=='.' || lastLetter=='?' || lastLetter=='!') {
                idx += 1
            }
        }
    }

    async render() {
        const renderSegment = (s) => {
            const $p = $("<p>")
            this.renderWords(s.wdlist, s, $p)
            this.$transcript.append($p)
        }
        for (const s of this.transcript.segments) {
            setTimeout(() => {
                renderSegment(s)
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
        await this.transcript.downloadMedia(headers, codec)
    }


}

async function cheap_nlp(sentence) {
    let doc = nlp(sentence)
    return doc.out('tags')
    // console.log(doc.nouns().list.map(a => a.text()))
}