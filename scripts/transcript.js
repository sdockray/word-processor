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
        console.log(json)
        this.segments = json.segments
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

    async loadAudio(sampler, docId, mediaId, start, end) {
        //console.log(start, end)
        //const segments = this.segments.filter(segment => (start >= segment.start && start< segment.end || end > segment.start && end <=segment.end))
        //if (segments.length > 1) {
        //    console.log("TODO: Handle a request spanning multiple segments")
        //} else {
        //    const mediaId = segments[0].media_id
            let spec = []
            let curT = 0
            spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: end-start, source_start: start, type: 'video', opacity: [[0,1]]})
            spec.push({dbpath: ['doc', docId, 'media', mediaId, 'blob_name'], start: curT, duration: end-start, source_start: start, type: 'audio', volume: [[0,1]]})
            curT += end - start
            // const sampler = new Sampler()
            return sampler.addFetch('/render', {
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
            }, start+'-'+end, start+'-'+end)
            //.then(sample => {
            //    sample.loop()
            //    sample.play()
            //})
        //}
    }
}


class TranscriptInterface {
    constructor($parent) {
        this.transcript = new Transcript()
        this.sequencer = new Sequencer()
        this.$parent = $parent
        this.$transcript = $("<div>") 
        this.$parent.append(this.$transcript)
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

    filter(filterFunc) {
        const visibleWords = this.$transcript.find('.w:visible')
        const speed = Math.round(2000/visibleWords.length)+2
        $.each(visibleWords, function (index, item) {
            if (!filterFunc($(item))) {
                setTimeout(() => {
                    $(item).fadeOut("slow")
                }, index*speed)
            }
        })
    }

    sort(sortFunc) {
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

    addRenderedWord($w) {
        this.$transcript.append($w).removeClass('selected')
        this.transcript.loadAudio(this.sequencer.sampler, $w.data('docId'), $w.data('mediaId'), $w.data('start'), $w.data('end'))
    }

    renderWords(wdlist, segment, $parent) {
        const regex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g
        // this.transcript.loadSegmentAudio(this.sequencer.sampler, segment)
        for (let wd of wdlist) {
            // console.log(wd)
            const $w = $("<span>").addClass('w').text(wd.word).data({
                start: wd.start,
                end: wd.end,
                word: wd.word.replace(regex, ''),
                phones: wd.phones,
                mediaId: segment.media_id,
                docId: this.transcript.docId
            })
            //this.transcript.loadAudio(this.sequencer.sampler, this.transcript.docId, segment.media_id, wd.start, wd.end)
            //this.transcript.loadLocalAudio(this.sequencer.sampler, wd.start, wd.end, "samples/" + this.transcript.docId)
            $w.on('mousedown', () => {
                $w.toggleClass('selected')
                //this.sequencer.sampler.play(wd.start +"-"+ wd.end)
                this.transcript.loadAudio(this.sequencer.sampler, this.transcript.docId, segment.media_id, wd.start, wd.end)
                    .then(sample => { sample.play() })
            })
            $parent.append($w)
        }
    }

    render() {
        for (let s of this.transcript.segments) {
            const $p = $("<p>")
            this.renderWords(s.wdlist, s, $p)
            this.$transcript.append($p)
        }
    }

}