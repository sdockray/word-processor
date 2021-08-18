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
    $stageContainer = $('<div>').addClass('stage card bg-gray-700')
    const $stage = $('<div>').addClass('words')
    const stage = new TranscriptInterface($stage)
    spirit.addSequencer(stage.sequencer)
    stages.push(stage)
    $('#stageChooser').append($('<option></option>').attr('value', stages.length - 1).text(stages.length))
    const $filters = $('<div>')
    const $sorters = $('<div>')
    // const $interval = $('<input>').addClass('interval').attr('placeholder', '4n').val("4n")
    const intervals = ["1n", "2n", "4n", "8n", "16n"]
    $interval = $('<select>').addClass('select input-xsmall form-group-input bg-gray-200')
    $.each(intervals, function (key, entry) {
        $interval.append($('<option></option>').attr('value', entry).text(entry))
    })
    $interval.prop('selectedIndex', 2)
    $interval.change((e) => {
        stage.sequencer.setInterval(e.target.value, $offset.val())
    })
    const $offset = $('<input>').addClass('offset form-group-input input-xsmall bg-gray-200').val("0")
    $offset.prop('type', 'number')
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
    //const stageFilters = new FilterInterface($filters, stage)
    //const stageSorters = new SorterInterface($sorters, stage)
    const thisWordInfo = new WordInfoInterface($('#wordInfo'), stage)
    $stage.on('wordSelected', (event, $w) => {
        thisWordInfo.setActiveWord($w)
    })
    $intervalLabel = $('<label>').addClass("form-group-label label-xsmall").text('interval')
    $offsetLabel = $('<label>').addClass("form-group-label label-xsmall").text('offset')
    $intervalOffsetContainer = $('<div>').addClass('form-group').append($intervalLabel).append($interval).append($offsetLabel).append($offset)
    //$stageContainer.append($filters).append($sorters).append($stage).append($intervalOffsetContainer)
    $stageContainer.append($stage).append($intervalOffsetContainer)
    $parent.append($stageContainer)
    $stageContainer.hide()
}

async function start() {
    // Set up the transcript chooser
    let dropdown = $('#transcriptChooser')
    dropdown.empty()
    dropdown.append('<option selected="true" disabled>load a transcript</option>')
    loadTranscriptList().then(transcriptData => {
        $.each(transcriptData, function (key, entry) {
            dropdown.append($('<option></option>').attr('value', key).text(entry))
        })    
    })
    let transcriptInterface = new TranscriptInterface($("#transcript"))
    const transcriptFilters = new FilterInterface($('#transcriptFilters'), transcriptInterface)
    const transcriptSorters = new SorterInterface($('#transcriptSorters'), transcriptInterface)
    const wordInfo = new WordInfoInterface($('#wordInfo'), transcriptInterface)
    $("#transcript").on('wordSelected', (event, $w) => {
        wordInfo.setActiveWord($w)
    })
    transcriptFilters.hide()
    transcriptSorters.hide()
    
    dropdown.change((e) => {
        transcriptInterface.$transcript.empty() 
        //transcriptInterface.loadTranscript(e.target.value, `transcripts/${e.target.value}.json`)
        transcriptInterface.loadTranscript(e.target.value)
        //
        let selectAllMode = true
        $('#selectAllButton').show()
        $('#selectAllButton').on('click', () => {
            $.each(transcriptInterface.$transcript.find('.w:visible'), function(index, item) {
                if (selectAllMode) {
                    $(item).addClass('selected')
                } else {
                    $(item).removeClass('selected')
                }
            })
            selectAllMode = !selectAllMode
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
    // expand and contract stage
    $('#expandButton').on('click', () => {
        if ($('#leftSide').hasClass('col-2')) {
            $('#middleSide').hide()
            $('#leftSide').removeClass('col-2')
            $('#leftSide').addClass('col-10')
        } else {
            $('#middleSide').show()
            $('#leftSide').removeClass('col-10')
            $('#leftSide').addClass('col-2')
        }
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


document.addEventListener('mouseup', event => {  
    if (window.getSelection().toString().length){
       let selection = window.getSelection()
       let range = selection.getRangeAt(0)
       //let selectedFragment = range.cloneContents()
       console.log(range)        
    }
})

start();