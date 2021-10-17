function buildStage($parent, $video) {
    $stageContainer = $('<div>').addClass('stage card bg-gray-700')
    const $unlock = $('<small class="unlock text-gray-000">').text('o')
    const $title = $('<small class="stage-title text-gray-000">')
    const $stage = $('<div>').addClass('words')
    const stage = new TranscriptInterface($stage)
    stage.sequencer.setVideoPlayer($video)
    spirit.addSequencer(stage.sequencer)
    stages.push(stage)
    $('#stageChooser').append($('<option></option>').attr('value', stages.length - 1).text(stages.length))
    const $filters = $('<div>')
    const $sorters = $('<div>')
    // const $interval = $('<input>').addClass('interval').attr('placeholder', '4n').val("4n")
    const intervals = ["1n", "2n", "4n", "8n", "16n", "custom wpm"]
    const $interval = $('<select>').addClass('select input-xsmall form-group-input bg-gray-200 interval')
    $.each(intervals, function (key, entry) {
        $interval.append($('<option></option>').attr('value', entry).text(entry))
    })
    $interval.prop('selectedIndex', 2)
    $interval.change((e) => {
        stage.sequencer.setInterval(e.target.value, $offset.val())
    })
    const $customInterval = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 customInterval u-none').val("60")
    $customInterval.prop('type', 'number')
    const $offset = $('<input>').addClass('offset form-group-input input-xsmall bg-gray-200').val("0")
    $offset.prop('type', 'number')
    const $downloadButton = $("<button>").addClass("tooltip tooltip--top--right form-group-btn btn-xsmall bg-gray-500").text('dl')
    $downloadButton.prop('data-tooltip', 'Download this track (buggy)')
    const $intervalLabel = $('<label>').addClass("tooltip form-group-label label-xsmall").text('interval')
    $intervalLabel.prop('data-tooltip', '4n is on the wpm beat')
    const $offsetLabel = $('<label>').addClass("tooltip form-group-label label-xsmall").text('offset')
    $offsetLabel.prop('data-tooltip', 'In milliseconds')
    const $patternLabel = $('<label>').addClass("form-group-label label-xsmall pattern").text('pattern')
    const $pattern = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 pattern').val("1111")
    const $volumeLabel = $('<label>').addClass("form-group-label label-xsmall volume").text('volume')
    const $volume = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 volume').val("10")
    $volume.prop('type', 'number')
    const $muteButton = $("<button>").addClass("form-group-btn btn-xsmall bg-gray-100").html('mute')
    const $rateLabel = $('<label>').addClass("form-group-label label-xsmall rate").text('rate')
    const $rate = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 rate').val("1")
    $rate.prop('type', 'number').prop('step', '.01')
    const $pitchLabel = $('<label>').addClass("form-group-label label-xsmall pitch").text('detune')
    const $pitch = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 pitch').val("0")
    $pitch.prop('type', 'number')
    const $playTrackButton = $("<button>").addClass("form-group-btn btn-xsmall btn-primary bg-gray-700").html('&#9658;')
    const $loopButton = $("<button>").addClass("form-group-btn btn-xsmall bg-green-500").html('loop')
    const $rmButton = $("<button>").addClass("form-group-btn btn-xsmall bg-red-700").html('x')
    
    const setIntervalOffset = (intervalVal, offsetVal) => {
            //Disable textbox to prevent multiple submit
            $offset.attr("disabled", "disabled")
            // stage.sequencer.updateBPM(parseInt($('#bpm').val()))
            stage.sequencer.setInterval(intervalVal, offsetVal)
            //Enable the textbox again if needed.
            $offset.removeAttr("disabled")
    }
    $interval.on('change', function (e) {
        if ($interval.val()=="custom wpm") {
            $customInterval.removeClass('u-none')
        } else {
            $customInterval.addClass('u-none')
            setIntervalOffset($interval.val(), $offset.val())
        }
    })
    $customInterval.on('keypress', function (e) {
        if(e.which === 13){
            const hz = $customInterval.val()/60
            setIntervalOffset(`${hz}hz`, $offset.val())
        }
    })
    $offset.on('keypress', function (e) {
        if(e.which === 13){
            setIntervalOffset($interval.val(), $offset.val())
        }
    })
    $volume.on('keypress', function (e) {
        if(e.which === 13){
            $volume.attr("disabled", "disabled")
            stage.sequencer.setVolume(parseInt($volume.val()))
            $volume.removeAttr("disabled")
        }
    })
    $pattern.on('keypress', function (e) {
        if(e.which === 13){
            $pattern.attr("disabled", "disabled")
            stage.sequencer.setPattern($pattern.val())
            $pattern.removeAttr("disabled")
        }
    })
    $rate.on('keypress', function (e) {
        if(e.which === 13){
            $rate.attr("disabled", "disabled")
            stage.sequencer.setRate(parseFloat($rate.val()))
            $rate.removeAttr("disabled")
        }
    })
    $pitch.on('keypress', function (e) {
        if(e.which === 13){
            $pitch.attr("disabled", "disabled")
            stage.sequencer.setPitch(parseInt($pitch.val()))
            $pitch.removeAttr("disabled")
        }
    })
    $downloadButton.on('click', function(e) {
        stage.download(parseInt($('#bpm').val()))
    })
    $playTrackButton.on('click', function(e) {
        stage.sequencer.startInterval()
    })
    $loopButton.on('click', function(e) {
        if ($loopButton.hasClass('bg-green-500')) {
            stage.sequencer.setLoop(false)
            $loopButton.removeClass('bg-green-500')
            $loopButton.addClass('bg-gray-100')
        } else {
            stage.sequencer.setLoop(true)
            $loopButton.addClass('bg-green-500')
            $loopButton.removeClass('bg-gray-100')
        }
    })
    let stashedVolume = 10
    $muteButton.on('click', function(e) {
        if ($muteButton.hasClass('bg-purple-500')) {
            stage.sequencer.setVolume(stashedVolume)
            $muteButton.removeClass('bg-purple-500')
            $muteButton.addClass('bg-gray-100')
        } else {
            stashedVolume = stage.sequencer.sampler.volume
            stage.sequencer.setVolume(-100)
            $muteButton.addClass('bg-purple-500')
            $muteButton.removeClass('bg-gray-100')
        }
    })
    //const stageFilters = new FilterInterface($filters, stage)
    //const stageSorters = new SorterInterface($sorters, stage)
    const thisWordInfo = new WordInfoInterface($('#wordInfo'), stage)
    thisWordInfo.startHistory('')
    $title.on('click', () => {
        const h = $title.text()
        $titleEdit = $('<input class="input-xsmall">').val(h)
        $titleEdit.on('keypress', function (e) {
            if(e.which === 13){
                const name = $titleEdit.val()
                $title.text(name)
                stage.sequencer.setName(name)
            }
        })
        $title.empty()
        $title.append($titleEdit)
        $titleEdit.focus()
    })
    $stage.on('wordSelected', (event, $w) => {
        setActiveInterface(stage)
        thisWordInfo.setActiveWord($w)
    })
    $unlock.on('click', () => {
        $stageContainer.addClass('resizable')
    })
    $rmButton.on('click', () => {
        $title.empty()
        stage.empty()
    })
    $intervalOffsetContainer = $('<div>').addClass('form-group')
        .append($downloadButton)
        .append($volumeLabel)
        .append($volume)
        .append($muteButton)
        .append($intervalLabel)
        .append($interval)
        .append($customInterval)
        .append($offsetLabel)
        .append($offset)
        .append($patternLabel)
        .append($pattern)
        .append($rateLabel)
        .append($rate)
        //.append($pitchLabel)
        //.append($pitch)
        .append($playTrackButton)
        .append($loopButton)
        .append($rmButton)
    //$stageContainer.append($unlock).append($title).append($stage).append($intervalOffsetContainer)
    $stageContainer.append($title).append($stage).append($intervalOffsetContainer)
    $parent.append($stageContainer)
    $stageContainer.hide()
}