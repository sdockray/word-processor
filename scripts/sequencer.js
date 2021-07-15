class Sample {
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
    this.player.volume.value = 20
    if (this.start>=0 && this.duration>=0) {
      this.player.start("0.05", this.start + .05, this.duration)
    } else {
      this.player.start("0.05")
    }
  }

  playTime(time) {
    this.player.sync().start()
  }

  clearCallback() {
    this.player.onstop = () => {}
  }

  adjustPitch(by) {
    if (!this.shifter) {
      this.shifter = new Tone.PitchShift().toDestination()
      console.log(by, this.shifter.pitch)
      this.player.connect(this.shifter)
    }
    this.shifter.pitch += by
  }

  adjustRate(by) {
    this.player.playbackRate = this.player.playbackRate*by
  }


  // this.shifter = new Tone.PitchShift({pitch: -1}).toDestination()
  // sample.connect(this.shifter)
  // this.samples[idx].
  // add pitch shifter, player label, etc
}  
  
// Contains the samples and is able to play them
class Sampler {
  constructor() {
    this.samples = {}
    this.add = this.add.bind(this)
    this.play = this.play.bind(this)
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
      .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        return this.add(audioBuffer, idx, label)
      })
      .catch(console.log)
    }
  }
  
  add(url, idx, label) {
    if (!this.samples.hasOwnProperty(idx)) {
      this.samples[idx] = new Sample(url)
      this.samples[idx].setLabel(label)
      return this.samples[idx]
    } else {
      return this.samples[idx]
    }
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

// Triggers samples in some kind of a sequence. Needs a sampler to start with.
class Sequencer {
  constructor(sampler) {
    this.sampler = new Sampler()
    this.sequence = []
    this.sequenceIdx = 0
    this.interval = "4n"
    this.offset = 0
    this.looping = false
    this.sequencing = false
    this.transportOffsetTime = 0
    this.add = this.add.bind(this)
    this.set = this.set.bind(this)
    this.play = this.play.bind(this)
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
    if (i < this.sequence.length) {
      this.sampler.play(this.sequence[i], () => {
        this.playNext(i+1)
        this.sampler.clearCallback(this.sequence[i])
      })
    } else if (this.looping) {
      this.playNext(0)
    }
  }

  play() {
    this.playNext(0)
  }

  async record() {
    const recorder = new Tone.Recorder()
    if (Tone.Transport.state == "started") {
      Tone.Transport.stop()
      Tone.Transport.cancel()
    }
    const that = this
    // Connect all players to the recorder
    for (const sampleId in this.sampler.samples) {
      this.sampler.samples[sampleId].player.connect(recorder)
    }
    // set up callback for saving file
    const stopRecording = () => {
      console.log("STOP RECORDING")
      return recorder.stop().then(recording => {
        const url = URL.createObjectURL(recording)
        make_download(url)
        return url
      })
    }
    const pass = () => {}
    let currCB = pass
    // Do the sequence
    Tone.Transport.scheduleRepeat((time) => {
      // Start recording at the start of the sequence
      if (that.sequenceIdx===0) {
        recorder.start()
      }
      if (that.sequenceIdx == that.sequence.length-1) {
        currCB = stopRecording
      } 
      that.sampler.play(that.sequence[that.sequenceIdx], currCB)
      that.sequenceIdx = that.sequenceIdx + 1
      // Stop at the end of the sequence
      if (that.sequenceIdx >= that.sequence.length) {
        Tone.Transport.stop()
        that.sequenceIdx = 0
      }
    }, "4n")
    Tone.start()
    Tone.Transport.start()
    
    /*
    const that = this
    //Tone.Offline(({ transport, rawContext }) => {
    Tone.Offline((offlineContext) => {
      const transport = offlineContext.transport
      for (const sampleId in that.sampler.samples) {
        //that.sampler.samples[sampleId].player.connect(listener)
        that.sampler.samples[sampleId].player.context = offlineContext
      }
      transport.scheduleRepeat((time) => {
        that.sampler.play(that.sequence[that.sequenceIdx])
        // that.sampler.playTime(that.sequence[that.sequenceIdx], time)
        that.sequenceIdx = (that.sequenceIdx + 1) % that.sequence.length
        if (!that.sequenceIdx) {
          // stop recording
          transport.stop()
        }
      }, "4n")
      transport.start()
    }, 4).then((buffer) => {
      // do something with the output buffer
      // console.log(buffer)
      prepare_download(buffer, buffer.length)
    })
    */
  }

  startInterval() {
    // If bpm is 0 then we're playing words sequentially
    //if (bpm === 0) {
    //  return this.play()
    //}
    const that = this
    this.sequenceIdx = 0
    console.log(`Sequencing at ${Tone.Transport.bpm.value} every ${this.interval}`)
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


class SequencerInterface {
  constructor(sequencer, $parent) {
      this.sequencer = sequencer
      this.$parent = $parent
      this.$sequencer = $("<div>") 
      this.$parent.append(this.$sequencer)
  }

  addSample(obj) {
      const sample = this.sequencer.addSample(obj.url, obj.id, obj.label)
      const $ele = $("<span>").addClass('w').text(obj.label)
      $ele.on('pitchChanged', function(e, by) {
          sample.adjustPitch(by)
      })
      $ele.on('rateChanged', function(e, by) {
          sample.adjustRate(by)
      })
      $ele.on('mousedown', function(e) {
          $ele.toggleClass('selected')           
      })
      document.addEventListener('keyup', function(e) {
          if (e.code == "ArrowUp") {
              $('.w.selected').trigger("pitchChanged", 1)
          } else if (e.code == "ArrowDown") {
              $('.w.selected').trigger("pitchChanged", -1)
          } else if (e.code == "ArrowLeft") {
              $('.w.selected').trigger("rateChanged", 1.01)
          } else if (e.code == "ArrowRight") {
              $('.w.selected').trigger("rateChanged", .99)
          }
      })
      this.$sequencer.append($ele)
  }
}

function prepare_download(abuffer, total_samples) {  
  const duration = abuffer.duration
	const rate = abuffer.sampleRate
	const offset = 0

	const url = URL.createObjectURL(bufferToWave(abuffer, total_samples))
  make_download(url)
  $('#downloadLink').attr('href', url)
  $('#downloadLink').attr('download', 'processed-words.wav')
  $('#downloadLink').text('download')
}

function make_download(url) {  
  $('#downloadLink').attr('href', url)
  $('#downloadLink').attr('download', 'processed-words.wav')
  $('#downloadLink').text('download')
}

// Convert an AudioBuffer to a Blob using WAVE representation
function bufferToWave(abuffer, len) {
  var numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [], i, sample,
      offset = 0,
      pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++                                     // next source sample
  }

  // create Blob
  return new Blob([buffer], {type: "audio/wav"});

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}