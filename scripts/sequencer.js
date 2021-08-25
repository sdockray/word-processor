
class AudioSample {
  constructor(url, player) {
    // console.log(url)
    if (url) {
      this.player = new Tone.Player({url: url})
      this.player.toDestination()
    } else if (player) {
      this.player = player
    }
    this.player.fadeIn = 0.1
    this.player.fadeOut = 0.1
    
    this.label = "..."
    this.pitchShifter = false
    this.start = -1
    this.duration = -1
    this.$ele = false

    //this.play
  }

  setElement($ele) {
    const that = this
    this.$ele = $ele
    $ele.on('focusPhones', (event, mode, num) => {
      if (mode=='starting') {
        that.setSpan(0 , $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i <= num) ? a + b: a ))
        const phonesStr = $ele.data('phones').map(p => p[0]).slice(0, num).join(',')
        $ele.text(phonesStr)
      } else if (mode=='ending') {
        const nPhones = $ele.data('phones').length - num
        const dur1 = $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i <= nPhones) ? a + b: a )
        that.setSpan(dur1 , $ele.data('end') - $ele.data('start') - dur1)
        const phonesStr = $ele.data('phones').map(p => p[0]).slice(-1*num).join(',')
        $ele.text(phonesStr)
      } else if (mode=="reset") {
        this.start = -1
        this.duration = -1
        const phonesStr = $ele.data('oWord')
        $ele.text(phonesStr)
      }
    })
    // this.setSpan(0 , $ele.data('phones').map(p => p[1]).reduce((a, b, i) => (i <= 3) ? a + b: a ))
  }

  setSpan(start, duration) {
    this.start = start
    this.duration = duration
  }

  setLabel(label) {
    this.label = label
  }

  loop(stop) {
    this.player.loop = !stop
  }

  play(onstop) {
    // this.samples[idx].playbackRate = 1.75;
    //console.log(this.label, onstop)
    if (onstop) {
      this.player.onstop = onstop
    } else {
      this.player.onstop = () => {}
    }
    if (!this.player.loaded) {
      // console.log('not loaded')
      this.player.onstop()
      return
    }
    //this.emit('starting')
    this.player.volume.value = 20
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
    this.player.onstop = () => {}
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
    const z = this.$video.css('z-index')
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

  set(sampleIds) {
    this.sequence = sampleIds
  }

  playNext(i) {
    if (i===0 || Tone.Transport.state == "started") {
      if (i < this.sequence.length) {
        this.sampler.play(this.sequence[i], () => {
          this.playNext(i+1)
          this.sampler.clearCallback(this.sequence[i])
        })
      } else if (this.sequence.length && this.looping) {
        this.playNext(0)
      }
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
    Tone.Transport.scheduleRepeat((time) => {
      setTimeout(() => {
        that.sampler.play(that.sequence[that.sequenceIdx], () => {}, that.offset)
        that.sequenceIdx = (that.sequenceIdx + 1) % that.sequence.length
      }, that.offset)
    }, this.interval)    
  }

  setInterval(interval, offset=0) {
    this.interval = interval
    this.offset = parseFloat(offset)
  }

  playOnBeat(bpm=180, interval="1i") {
    // If bpm is 0 then we're playing words sequentially
    if (bpm === 0) {
      return this.play()
    }
    // set the tempo in beats per minute.
    this.updateBPM(bpm)
    if (Tone.Transport.state == "started") {
      console.log("Pausing sequencer")
      Tone.Transport.pause()
      //Tone.Transport.cancel()
      this.transportOffsetTime -= Tone.Transport.immediate() // to prepare for adding when unpaused below
      // Tone.Transport.dispose()
      return true
    }
    const that = this
    if (!this.transportOffsetTime) {
      console.log(`Sequencing at ${Tone.Transport.bpm.value} every ${interval}`)
      // telling the transport to execute our callback function every eight note.
      this.transportOffsetTime += Tone.Transport.immediate()
      Tone.Transport.scheduleRepeat((time) => {
        //const transportTicks = Tone.Transport.getTicksAtTime(time)
        //const sequenceIdx = transportTicks % that.sequence.length
        //console.log(Tone.Transport.immediate(), transportTicks)
        //that.sampler.playTime(that.sequence[that.sequenceIdx], time - this.transportOffsetTime)
        that.sampler.play(that.sequence[that.sequenceIdx])
        // that.sampler.playTime(that.sequence[that.sequenceIdx], time)
        that.sequenceIdx = (that.sequenceIdx + 1) % that.sequence.length
      }, interval)
    } else {
      this.transportOffsetTime += Tone.Transport.immediate() // see note above
    }
    Tone.start();
    Tone.Transport.start()
  }

  updateBPM(bpm) {
    if (Tone.Transport.bpm.value != bpm) {
      console.log("Setting bpm to:", bpm)
      Tone.Transport.bpm.value = bpm
    }
  }

  // TODO: bpm sequencing
}


class MultiSequencer {
  constructor() {
    this.sequencers = []
  }

  addSequencer(s) {
    this.sequencers.push(s)
  }

  playOnBeat() {
    if (Tone.Transport.state == "started") {
      console.log("Pausing sequencer")
      Tone.Transport.stop()
      Tone.Transport.cancel()
      return
    }
    for (const s of this.sequencers) {
      s.startInterval()
    }
    // Tone.start()
    Tone.Transport.start()
  }

  updateBPM(bpm) {
    if (Tone.Transport.bpm.value != bpm) {
      console.log("Setting bpm to:", bpm)
      Tone.Transport.bpm.value = bpm
    }
  }
}

