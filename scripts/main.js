let stages = []
const spirit = new MultiSequencer()
const orgId = 'bdee032746'

async function loadTranscriptList() {
    return $.getJSON( "/userdb").then( data => {
        let transcriptData = {}
        $.each( data['db']['doc'], function( key, val ) {
            transcriptData[key] = val['title']
        })
        return transcriptData
    })
}

function buildStage($parent) {
    $stageContainer = $('<div>').addClass('stage')
    const $stage = $('<div>').addClass('words')
    const stage = new TranscriptInterface($stage)
    spirit.addSequencer(stage.sequencer)
    stages.push(stage)
    $('#stageChooser').append($('<option></option>').attr('value', stages.length - 1).text(stages.length))
    const $filters = $('<div>')
    const $sorters = $('<div>')
    // const $interval = $('<input>').addClass('interval').attr('placeholder', '4n').val("4n")
    const intervals = ["1n", "2n", "4n", "8n", "16n"]
    $interval = $('<select>')
    $.each(intervals, function (key, entry) {
        $interval.append($('<option></option>').attr('value', entry).text(entry))
    })
    $interval.prop('selectedIndex', 2)
    $interval.change((e) => {
        stage.sequencer.setInterval(e.target.value, $offset.val())
    })
    const $offset = $('<input>').addClass('offset').val("0")
    $interval.on('keypress', function (e) {
        if(e.which === 13){
            //Disable textbox to prevent multiple submit
            $(this).attr("disabled", "disabled")
            // stage.sequencer.updateBPM(parseInt($('#bpm').val()))
            stage.sequencer.setInterval($interval.val(), $offset.val())
            //Enable the textbox again if needed.
            $(this).removeAttr("disabled")
        }
    })
    const stageFilters = new FilterInterface($filters, stage)
    const stageSorters = new SorterInterface($sorters, stage)
    $stageContainer.append($filters).append($sorters).append($stage).append($interval).append($offset)
    $parent.append($stageContainer)
    $stageContainer.hide()
}

async function start() {
    // Set up the transcript chooser
    let dropdown = $('#transcriptChooser')
    dropdown.empty()
    dropdown.append('<option selected="true" disabled>load a transcript</option>')
    dropdown.prop('selectedIndex', 0)
    loadTranscriptList().then(transcriptData => {
        $.each(transcriptData, function (key, entry) {
            dropdown.append($('<option></option>').attr('value', key).text(entry))
        })    
    })
    /*
    $.each(transcriptData, function (key, entry) {
        dropdown.append($('<option></option>').attr('value', key).text(entry))
    })    
    */
    let transcriptInterface = new TranscriptInterface($("#transcript"))
    const transcriptFilters = new FilterInterface($('#transcriptFilters'), transcriptInterface)
    const transcriptSorters = new SorterInterface($('#transcriptSorters'), transcriptInterface)
    transcriptFilters.hide()
    transcriptSorters.hide()
    
    dropdown.change((e) => {
        transcriptInterface.$transcript.empty() 
        //transcriptInterface.loadTranscript(e.target.value, `transcripts/${e.target.value}.json`)
        transcriptInterface.loadTranscript(e.target.value)
        //
        $('#selectAllButton').show()
        $('#selectAllButton').on('click', () => {
            $.each(transcriptInterface.$transcript.find('.w:visible'), function(index, item) {
                $(item).addClass('selected')
            })
        })
        //
        $('#sendButton').show()
        $('#stageChooser').show()
        $('#sendButton').on('click', () => {
            const stage = stages[parseInt($('#stageChooser').val())]
            stage.$parent.parent().show()
            $.each(transcriptInterface.$transcript.find('.w.selected:visible'), function(index, item) {
                // $(item).clone().appendTo($('#stage')).removeClass('selected')
                stage.addRenderedWord($(item).clone(true).off())
                $(item).removeClass('selected')
            })
        })
        // Set up the transcript filters and sorters
        transcriptFilters.show()
        transcriptSorters.show()
    })
    // set up buttons
    $('#selectAllButton').hide()
    $('#sendButton').hide()
    $('#stageChooser').hide()
    // set up stage
    buildStage($('#stages'))
    buildStage($('#stages'))
    buildStage($('#stages'))
    $('#interval').hide()
    $('#playButton').on('click', () => {
        spirit.updateBPM(parseInt($('#bpm').val()))
        $.each(stages, function (key, stage) {
            stage.getCurrentSequence()
        })
        spirit.playOnBeat()
    })
    $('#recordButton').on('click', () => {
        stage.getCurrentSequence()
        stage.sequencer.record()
    })
    $('#bpm').on('keypress', function (e) {
        if(e.which === 13){
            const bpm = parseInt($('#bpm').val())
            //Disable textbox to prevent multiple submit
            $(this).attr("disabled", "disabled")
            spirit.updateBPM(bpm)
            if (bpm===0 || (bpm > 60) && (bpm < 100)) {
                //$('.stage .w').css('display', 'inline')
                $('.stage .w').css('margin-right', '5px')
            } else if (bpm > 60 ) {
                //$('.stage .w').css('display', 'inline')
                $('.stage .w').css('margin-right', -5 * (bpm / 60)  +'px')
            } else {
                //$('.stage .w').css('display', 'block')
                //$('.stage .w').css('margin-top', 20 * 60 / bpm  +'px')
                $('.stage .w').css('margin-right', 20 * 60 / bpm  +'px')
            }
            //Enable the textbox again if needed.
            $(this).removeAttr("disabled")
        }
    })
}

start();