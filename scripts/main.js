
function fire() {
    console.log("button fired!")  
    for (let i=0; i<units.length; i++) {
        units[i].sequencer.looping = true
        units[i].sequencer.play() 
    }
    transcriptInterface.getCurrentSequence()
}


let units = []
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
        $('#sendButton').on('click', () => {
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
    // set up stage
    const stage = new TranscriptInterface($('#stage'))
    const stageFilters = new FilterInterface($('#stageFilters'), stage)
    const stageSorters = new SorterInterface($('#stageSorters'), stage)
    $('#interval').hide()
    $('#playButton').on('click', () => {
        stage.getCurrentSequence()
        stage.sequencer.playOnBeat(parseInt($('#bpm').val()), $('#interval').val())
    })
    $('#recordButton').on('click', () => {
        stage.getCurrentSequence()
        stage.sequencer.record()
    })
    $('#bpm').on('keypress', function (e) {
        if(e.which === 13){
            //Disable textbox to prevent multiple submit
            $(this).attr("disabled", "disabled")
            stage.sequencer.updateBPM(parseInt($('#bpm').val()))
            //Enable the textbox again if needed.
            $(this).removeAttr("disabled")
        }
    })
}

start();