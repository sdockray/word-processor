const extractAudioFeatures = (channelData) => {
  //
  const stdDev = (array) => {
    const n = array.length
    const mean = array.reduce((a, b) => a + b) / n
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
  }
  const vectorSum = (r, a) => r.map((b, i) => a[i] + b)
  const objAvg = (data) => {
    return Array.from(data.reduce(
      (acc, obj) => Object.keys(obj).reduce( 
          (acc, key) => typeof obj[key] == "number"
              ? acc.set(key, ( // immediately invoked function:
                      ([sum, count]) => [sum+obj[key], count+1] 
                  )(acc.get(key) || [0, 0])) // pass previous value
              : acc,
      acc),
    new Map())).reduce(
      (acc, [key, [sum, count]]) => Object.assign(acc, { [key]: sum/count }),
      {},
    )
  }
  const fitLine = (data, name, multiplier, arrIdx=-1) => {
    if (arrIdx<0) {
      return regression.linear(data.map((p, idx) => [idx, multiplier*p[name]]))
    } else {
      return regression.linear(data.map((p, idx) => [idx, multiplier*p[name][arrIdx]]))
    }
  }
  const doMeyda = (name, cd, size) => {
    let index = 0
    let arr = []
    while (index < cd.length - 4096) {
      let features = Meyda.extract(name, cd.slice(index, index + 4096))
      Object.keys(features).forEach(function(key) {
        if (Array.isArray(features[key])) {
          // nop, this is the case iwth mfcc
        } else if(features[key] === null || isNaN(features[key])) {
          features[key] = 0;
        }
      })
      arr.push(features)
      //console.log(chroma)
      index += 4096
    }
    //const sampleNum = arr.length
    //const mfccAvg = arr.map(p => p.mfcc).reduce(vectorSum).map(a => a/sampleNum)
    const fitted = {
      'rms': fitLine(arr, 'rms', 100),
      'spectralSlope': fitLine(arr, 'spectralSlope', 100000000),
      'mfcc': [fitLine(arr, 'mfcc', 1, 0), fitLine(arr, 'mfcc', 1, 1)],
      'zcr': stdDev(arr.map(p => p.zcr))
    }
    return fitted
    /*
    let avgFeatures = objAvg(arr)
    avgFeatures.mfcc = mfccAvg
    avgFeatures.zcr = Math.sqrt(
      arr.map(p => p.zcr).reduce((acc, val) => acc.concat((val - avgFeatures.zcr) ** 2), []).reduce((acc, val) => acc + val, 0) /
        (arr.length - 1)
    )
    */
    //return avgFeatures
  }

  Meyda.chromaBands = 12
  Meyda.bufferSize = 4096
  Meyda.numberOfMFCCCoefficients = 2
  const features = doMeyda(['rms', 'zcr', 'spectralSlope', 'mfcc'/*, 'mfcc'*/], channelData)
  return features
}

class AudioSample {
  constructor(url, player) {
    // console.log(url)
    this.audioFeatures = {}
    this.audioBuffer = false
    if (url) {
      this.audioBuffer = url
      //this.player = new Tone.GrainPlayer({url: url})
      this.player = new Tone.Player({url: url})
      this.player.toDestination()
      this.extractAudioFeatures()
    } else if (player) {
      this.player = player
    }
    this.stopFns = []
    this.player.onstop = this.stopping.bind(this)
    this.player.fadeIn = 0.1
    this.player.fadeOut = 0.1
    
    this.label = "..."
    this.pitchShifter = false
    this.volume = 10
    this.playbackRate = 1
    this.pitch = 0
    this.start = -1
    this.duration = -1
    this.$ele = false

    //this.play
  }

  setElement($ele) {
    const that = this
    this.$ele = $ele
    this.tellEleAboutFeatures()
    const phoneExtraction = (startIdx, num) => {
      const dur1 = $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i < startIdx) ? a + b: a, 0 )
      const dur2 = $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i >= startIdx && i <= startIdx + num) ? a + b: a )
      that.setSpan(dur1 , dur2)
      const phonesStr = $ele.data('phones').map(p => p[0]).slice(startIdx, startIdx + num).join(',')
      $ele.text(phonesStr)
    } 
    $ele.on('focusPhones', (event, mode, num, startAt) => {
      if (mode=='starting') {
        phoneExtraction(0, num)
      } else if (mode=='ending') {
        const nPhones = $ele.data('phones').length - num
        phoneExtraction(nPhones, num)
      } else if (mode=='from') {
        const start = startAt - 1
        phoneExtraction(start, num)
      } else if (mode=="reset") {
        this.start = -1
        this.duration = -1
        const phonesStr = $ele.data('oWord')
        $ele.text(phonesStr)
      }
    })
    $ele.on('focusSyllables', (event, mode, num, startAt) => {
      const sylls = syllables($ele.data('phones'))
      const syllExtraction = (startIdx, numSylls) => {
        const startPhoneIdx = sylls.map(s => s.length).reduce((a, b, i) => (i < startIdx) ? a + b: a, 0 )
        const numPhones = sylls.map(s => s.length).reduce((a, b, i) => (i >= startIdx && i < startIdx + numSylls) ? a + b: a )
        //console.log(startIdx, numSylls, startPhoneIdx, numPhones)
        phoneExtraction(startPhoneIdx, numPhones)
      }
      if (mode=='starting') {
        // num sylables = how many phonemes?
        syllExtraction(0, num)
      } else if (mode=='ending') {
        const nSylls = sylls.length - num
        syllExtraction(nSylls, num)
      } else if (mode=='from') {
        const start = startAt - 1
        syllExtraction(start, num)
      } else if (mode=="reset") {
        this.start = -1
        this.duration = -1
        const phonesStr = $ele.data('oWord')
        $ele.text(phonesStr)
      }
    })
    // this.setSpan(0 , $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i <= 3) ? a + b: a ))
  }

  tellEleAboutFeatures() {
    if (this.$ele && this.audioFeatures) {
      //this.$ele.data('rms', this.audioFeatures.rms)
      //this.$ele.data('zcr', this.audioFeatures.zcr)
      //this.$ele.data('spectralSlope', this.audioFeatures.spectralSlope)
      this.$ele.data(this.audioFeatures)
    }
  }

  extractAudioFeatures() {
    this.audioFeatures = extractAudioFeatures(this.audioBuffer.getChannelData(0))
    this.tellEleAboutFeatures()
  }

  setSpan(start, duration) {
    this.start = start
    this.duration = duration
  }

  setLabel(label) {
    this.label = label
  }

  setVolume(volume) {
    this.volume = volume
  }

  setRate(rate) {
    this.playbackRate = rate
  }

  setPitch(pitch) {
    this.pitch = pitch
  }

  loop(stop) {
    this.player.loop = !stop
  }

  stopping() {
    this.$ele.removeClass('playing')
    if (this.stopFns) {
      for (const fn of this.stopFns) {
        fn()
      }
    } 
  }

  play(onstop) {
    // this.samples[idx].playbackRate = 1.75;
    //console.log(this.label, onstop)
    if (onstop) {
      this.stopFns.push(onstop)
    }
    if (!this.player.loaded) {
      // console.log('not loaded')
      this.player.onstop()
      return
    }
    //
    this.$ele.addClass('playing')
    //this.emit('starting')
    this.player.volume.value = this.volume
    this.player.playbackRate = this.playbackRate
    //this.player.detune = this.pitch
    if (this.start>=0 && this.duration>=0) {
      this.player.start("0.05", this.start + .05, this.duration)
      //this.player.start(0, this.start, this.duration)
    } else {
      this.player.start("0.05")
      //this.player.start()
    }
  }

  playTime(time) {
    this.player.sync().start()
  }

  clearCallback() {
    this.stopFns = []
  }

}  


class SmoothVideo {
  constructor($ele) {
    this.$video = $ele
  }

  loadAndPlay(src, onstop) {
    const that = this
    const $cloned = this.$video.clone()
    this.$video.parent().append($cloned)
    this.$video.addClass('garbage')
    const z = parseInt(this.$video.css('z-index'))
    $cloned.css("z-index", z+1)
    // once loaded swap and play
    $cloned.get(0).addEventListener('loadeddata', () => {
      // that.$video.replaceWith($cloned)
      that.$video = $cloned
      $('.garbage').remove()
    }, {once: true})
    // once it can play, play
    $cloned.get(0).addEventListener('canplay', () => {
      $cloned.get(0).play()
    }, {once: true})
    // what to do when it ends
    $cloned.get(0).addEventListener('ended', () => {
      onstop()
    }, {once: true})
    $cloned.css("z-index", z+1)
    $cloned.get(0).src = src
  }
}


class VideoSample {
  constructor(url, player) {
    // console.log(url)
    this.url = url
    this.player = player
    this.loop = true
    this.label = "..."
    this.start = -1
    this.duration = -1
    this.$ele = false
    this.onstop = () => {}

  }

  setElement($ele) {
    const that = this
    this.$ele = $ele
  }

  setSpan(start, duration) {
    this.start = start
    this.duration = duration
  }

  setLabel(label) {
    this.label = label
  }

  setVolume(volume) {
    // nop. can't set volume on videos
  }

  loop(stop) {
    this.loop = !stop
  }

  play(onstop) {
    // this.samples[idx].playbackRate = 1.75;
    //console.log(this.label, onstop)
    if (onstop) {
      this.onstop = onstop
    } else {
      this.onstop = () => {}
    }
    if (!this.url) {
      // console.log('not loaded')
      this.onstop()
      return
    }
    if (this.start>=0 && this.duration>=0) {
      // @TODO: play range
      this.player.loadAndPlay(this.url, this.onstop)
    } else {
      this.player.loadAndPlay(this.url, this.onstop)
    }
  }

  playTime(time) {
    this.play()
  }

  clearCallback() {
    this.onstop = () => {}
  }

}  


// Contains the samples and is able to play them
class Sampler {
  constructor() {
    this.samples = {}
    this.volume = 10
    this.rate = 1
    this.pitch = 0 // detune
    this.play = this.play.bind(this)
  }

  remove(idx) {
    if (this.samples.hasOwnProperty(idx)) {
      delete this.samples[idx]
      delete this.labels[idx]
    }
  }

  loop(idx, stop) {
    this.samples[idx].loop(stop)
  }

  play(idx, onstop) {
    if (this.samples.hasOwnProperty(idx)) {
      this.samples[idx].play(onstop)
    } else {
      //console.log(this.samples)
      if (onstop) {
        onstop()
      } else {
        () => {}
      }
    }
  }

  playTime(idx, time) {
    if (this.samples.hasOwnProperty(idx)) {
      this.samples[idx].playTime(time)
    } else {
      console.log("Couldn't play sample: ", idx)
    }
  }

  clearCallback(idx) {
    if (this.samples.hasOwnProperty(idx)) {
      this.samples[idx].clearCallback()
    }
  }

  setVolume(volume) {
    console.log('setting volume to:', volume)
    this.volume = volume
    for (const idx in this.samples) {
      this.samples[idx].setVolume(volume)
    }
  }

  setRate(rate) {
    console.log('setting rate to:', rate)
    this.rate = rate
    for (const idx in this.samples) {
      this.samples[idx].setRate(rate)
    }
  }

  setPitch(pitch) {
    console.log('detuning to:', pitch)
    this.pitch = pitch
    for (const idx in this.samples) {
      this.samples[idx].setPitch(pitch)
    }
  }

  export() {
    let data = {}
    for (const idx in this.samples) {
      const $ele = this.samples[idx].$ele
      data[idx] = $ele.data()
      if (this.samples[idx].start>=0 && this.samples[idx].duration>=0) {
        data[idx]['span'] = [this.samples[idx].start, this.samples[idx].duration]
      }
      data[idx].display = $ele.text()
    }
    return data
  }

}


class AudioSampler extends Sampler {
  constructor() {
    super()
    this.preferredCodec = 'wav'
  }

  addSample(url, idx, label) {
    if (!this.samples.hasOwnProperty(idx)) {
      this.samples[idx] = new AudioSample(url)
      this.samples[idx].setLabel(label)
      return this.samples[idx]
    } else {
      return this.samples[idx]
    }
  }

  async addFetch(url, opts, idx, label) {
    if (Array.isArray(idx)) {
      await fetch(url, opts)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        const player = new Tone.Player({url: audioBuffer})
        player.toDestination()
        for (const p of idx) {
          this.samples[p.idx] = new AudioSample(false, player)
          this.samples[p.idx].setLabel(p.label)
          this.samples[p.idx].setSpan(p.start, p.duration)
        }
        //console.log(this.samples)
        return true
      })
      .catch(console.log)
    } else {
      return await fetch(url, opts)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        return this.addSample(audioBuffer, idx, label)
      })
      .catch(console.log)
    } 
  }
}


class VideoSampler extends Sampler {
  constructor() {
    super()
    this.preferredCodec = 'mp4'
    this.player = false
  }

  setPlayer(player) {
    this.player = new SmoothVideo(player)
    for (const s in this.samples) {
      this.samples[s].player = this.player
    }
  }

  addSample(url, idx, label) {
    if (!this.samples.hasOwnProperty(idx)) {
      this.samples[idx] = new VideoSample(url, this.player)
      this.samples[idx].setLabel(label)
      return this.samples[idx]
    } else {
      return this.samples[idx]
    }
  }

  async addFetch(url, opts, idx, label) {
    if (Array.isArray(idx)) {
      await fetch(url, opts)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        const player = new Tone.Player({url: audioBuffer})
        player.toDestination()
        for (const p of idx) {
          this.samples[p.idx] = new Sample(false, player)
          this.samples[p.idx].setLabel(p.label)
          this.samples[p.idx].setSpan(p.start, p.duration)
        }
        //console.log(this.samples)
        return true
      })
      .catch(console.log)
    } else {
      return await fetch(url, opts)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const blob = new Blob([arrayBuffer], {type: "video/mp4"})
        return URL.createObjectURL(blob)
      })
      .then(url => {
        return this.addSample(url, idx, label)
      })
      .catch(console.log)
    }
  }  
}


// Triggers samples in some kind of a sequence. Needs a sampler to start with.
class Sequencer {
  constructor(sampler) {
    this.name = ""
    this.audioSampler = new AudioSampler()
    this.videoSampler = new VideoSampler()
    this.sampler = this.audioSampler
    this.sequence = []
    this.sequenceIdx = 0
    this.interval = "4n"
    this.offset = 0
    this.looping = true
    this.sequencing = false
    this.transportOffsetTime = 0
    this.add = this.add.bind(this)
    this.set = this.set.bind(this)
    this.play = this.play.bind(this)
    this.setPattern("1111") 
  }

  setVideoPlayer(videoPlayer) {
    this.videoSampler.setPlayer(videoPlayer)
  }

  useSampler(mode) {
    if (mode=="video") {
      this.sampler = this.videoSampler
    } else {
      this.sampler = this.audioSampler
    }
  }

  addSample(url, id, label) {
    const sample = this.sampler.add(url, id, label)
    this.add(id)
    return sample
  }

  add(sampleId) {
    this.sequence.push(sampleId)
  }

  setName(name) {
    this.name = name
  }

  set(sampleIds) {
    this.sequence = sampleIds
  }

  setLoop(b) { 
    this.looping = b
    if (b) {
      this.startInterval()
    }
  }

  playNext(i) {
    if (i===0 || Tone.Transport.state == "started") {
      setTimeout(() => {
        if (i < this.sequence.length) {
          this.sampler.play(this.sequence[i], () => {
            this.playNext(i+1)
            this.sampler.clearCallback(this.sequence[i])
          })
        } else if (this.sequence.length && this.looping) {
          this.playNext(0)
        }
      }, this.offset)
    }
  }

  play() {
    this.playNext(0)
  }

  startInterval() {
    // If bpm is 0 then we're playing words sequentially
    if (Tone.Transport.bpm.value === 0) {
      return this.play()
    }
    const that = this
    this.sequenceIdx = 0
    console.log(`Sequencing at ${Tone.Transport.bpm.value} every ${this.interval} with offset ${this.offset}`)
    const eventId = Tone.Transport.scheduleRepeat((time) => {
      if (that.patternArr.length === 0 || that.patternArr[that.patternIdx]==="1") {
        setTimeout(() => {
          that.sampler.play(that.sequence[that.sequenceIdx], () => {}, that.offset)
          that.sequenceIdx = (that.sequenceIdx + 1) % that.sequence.length
          if (!that.looping && that.sequenceIdx === 0) {
            Tone.Transport.clear(eventId)
          }
        }, that.offset)
      } 
      that.patternIdx = (that.patternIdx+1) % that.patternArr.length
    }, this.interval)    
  }

  setInterval(interval, offset=0) {
    this.interval = interval
    this.offset = parseFloat(offset)
  }

  setPattern(pattern) {
    if (/^[01]+$/.test(pattern)) {
      this.pattern = pattern
      this.patternArr = this.pattern.split('')
      this.patternIdx = 0
    }
  }

  setVolume(volume) {
    if (Number.isInteger(volume)) {
      this.sampler.setVolume(volume)
    }
  }

  setRate(rate) {
    if (!isNaN(rate)) {
      this.sampler.setRate(rate)
    }
  }

  setPitch(pitch) {
    if (Number.isInteger(pitch)) {
      this.sampler.setPitch(pitch)
    }
  }

  updateBPM(bpm) {
    if (Number.isInteger(bpm) && Tone.Transport.bpm.value != bpm) {
      console.log("Setting bpm to:", bpm)
      Tone.Transport.bpm.value = bpm
    }
  }

  load(data) {
    this.setInterval(data.interval, data.offset)
    this.setVolume(data.volume) 
    this.setRate(data.rate) 
    this.setPitch(data.pitch) 
  }

  export() {
    return {
      name: this.name,
      pattern: this.pattern,
      interval: this.interval,
      offset: this.offset,
      volume: this.sampler.volume,
      rate: this.sampler.rate,
      pitch: this.sampler.pitch,
      sequence: this.sequence,
      samples: this.sampler.export()
    }   
  }

}


class MultiSequencer {
  constructor() {
    this.sequencers = []
  }

  addSequencer(s) {
    this.sequencers.push(s)
  }

  playPause() {
    if (Tone.Transport.state == "started") {
      this.pause()
    } else {
      this.playOnBeat()
    }
  }

  pause() {
    if (Tone.Transport.state == "started") {
      console.log("Pausing sequencer")
      Tone.Transport.stop()
      Tone.Transport.cancel()
      return
    }
  }

  playOnBeat() {    
    this.pause()
    // console.log(this.sequencers)
    for (const s of this.sequencers) {
      s.startInterval()
    }
    // Tone.start()
    Tone.Transport.start()
  }

  updateBPM(bpm) {
    const prevBpm = Tone.Transport.bpm.value
    if (prevBpm != bpm) {
      console.log("Setting bpm to:", bpm)
      Tone.Transport.bpm.value = bpm
      /* // doesnt work yet
      if (prevBpm===0 || bpm===0) {
        this.pause()
        this.playOnBeat()
      }
      */
    }
  }

  load(data) {
    this.updateBPM(data.bpm)
  }

  // export for saving
  export() {
    let data = {
      bpm: Tone.Transport.bpm.value,
      sequencers: []
    }
    for (const s of this.sequencers) {
      data.sequencers.push(s.export())
    }
    // console.log(data)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data))
    let a = document.createElement('a')
    a.href = dataStr
    a.download = "processed-words.json"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
}
