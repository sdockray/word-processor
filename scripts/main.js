let stages = []
let transcriptInterface = null
const spirit = new MultiSequencer()
const orgId = 'bdee032746'

function debounce(func, limit = 300){
    var wait = false;                  // Initially, we're not waiting
    return function () {               // We return a throttled function
        if (!wait) {                   // If we're not waiting
            func.call();           // Execute users function
            wait = true;               // Prevent future invocations
            setTimeout(function () {   // After a period of time
                wait = false;          // And allow future invocations
            }, limit);
        }
    }
}

async function loadTranscriptList() {
    return $.getJSON( "/userdb").then( data => {
        let transcriptData = {}
        $.each( data['db']['doc'], function( key, val ) {
            transcriptData[key] = val['title']
        })
        return transcriptData
    })
}


function setActiveInterface(t) {
    transcriptInterface.isActive = false
    for (const stage of stages) {
        stage.isActive = false
    }
    t.isActive = true
}

function buildStage($parent, $video) {
    $stageContainer = $('<div>').addClass('stage card bg-gray-700')
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
    const intervals = ["1n", "2n", "4n", "8n", "16n"]
    const $interval = $('<select>').addClass('select input-xsmall form-group-input bg-gray-200 interval')
    $.each(intervals, function (key, entry) {
        $interval.append($('<option></option>').attr('value', entry).text(entry))
    })
    $interval.prop('selectedIndex', 2)
    $interval.change((e) => {
        stage.sequencer.setInterval(e.target.value, $offset.val())
    })
    const $offset = $('<input>').addClass('offset form-group-input input-xsmall bg-gray-200').val("0")
    $offset.prop('type', 'number')
    const $downloadButton = $("<button>").addClass("tooltip tooltip--top--right form-group-btn btn-xsmall bg-gray-500").text('dl')
    $downloadButton.prop('data-tooltip', 'Download this track (buggy)')
    const $intervalLabel = $('<label>').addClass("tooltip form-group-label label-xsmall").text('interval')
    $intervalLabel.prop('data-tooltip', '4n is on the wpm beat')
    const $offsetLabel = $('<label>').addClass("tooltip form-group-label label-xsmall").text('offset')
    $offsetLabel.prop('data-tooltip', 'In milliseconds')
    const $volumeLabel = $('<label>').addClass("form-group-label label-xsmall volume").text('volume')
    const $volume = $('<input>').addClass('form-group-input input-xsmall bg-gray-200 volume').val("10")
    $volume.prop('type', 'number')
    const setIntervalOffset = (e) => {
        if(e.which === 13){
            //Disable textbox to prevent multiple submit
            $offset.attr("disabled", "disabled")
            // stage.sequencer.updateBPM(parseInt($('#bpm').val()))
            stage.sequencer.setInterval($interval.val(), $offset.val())
            //Enable the textbox again if needed.
            $offset.removeAttr("disabled")
        }
    }
    $interval.on('change', function (e) {
       setIntervalOffset(e)
    })
    $offset.on('keypress', function (e) {
        setIntervalOffset(e)
    })
    $volume.on('keypress', function (e) {
        if(e.which === 13){
            $volume.attr("disabled", "disabled")
            stage.sequencer.setVolume(parseInt($volume.val()))
            $volume.removeAttr("disabled")
        }
    })
    $downloadButton.on('click', function(e) {
        stage.download(parseInt($('#bpm').val()))
    })
    //const stageFilters = new FilterInterface($filters, stage)
    //const stageSorters = new SorterInterface($sorters, stage)
    const thisWordInfo = new WordInfoInterface($('#wordInfo'), stage)
    thisWordInfo.startHistory('')
    $title.on('click', () => {
        const h = $title.text()
        $title.text(h + ' / ' + thisWordInfo.getHistory())
    })
    $stage.on('wordSelected', (event, $w) => {
        setActiveInterface(stage)
        thisWordInfo.setActiveWord($w)
    })
    $intervalOffsetContainer = $('<div>').addClass('form-group')
        .append($downloadButton)
        .append($volumeLabel)
        .append($volume)
        .append($intervalLabel)
        .append($interval)
        .append($offsetLabel)
        .append($offset)
    //$stageContainer.append($filters).append($sorters).append($stage).append($intervalOffsetContainer)
    $stageContainer.append($title).append($stage).append($intervalOffsetContainer)
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
        const v = dropdown.find('option:contains(Word Processor Demo)').val()
        if (v) {
            dropdown.val(v).trigger('change')
        }
    })
    transcriptInterface = new TranscriptInterface($("#transcript"))
    const transcriptFilters = new FilterInterface($('#transcriptFilters'), transcriptInterface)
    const transcriptSorters = new SorterInterface($('#transcriptSorters'), transcriptInterface)
    const wordInfo = new WordInfoInterface($('#wordInfo'), transcriptInterface)
    $("#transcript").on('wordSelected', (event, $w) => {
        setActiveInterface(transcriptInterface)
        wordInfo.setActiveWord($w)
        //transcriptInterface.playTranscriptSegment($w.parent(), $w)
    })
    transcriptFilters.hide()
    transcriptSorters.hide()
    
    dropdown.change((e) => {
        transcriptInterface.$transcript.empty() 
        //transcriptInterface.loadTranscript(e.target.value, `transcripts/${e.target.value}.json`)
        transcriptInterface.loadTranscript(e.target.value)
        wordInfo.startHistory(dropdown.find(":selected").text())
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
        $('#reload').on('click', () => {
            transcriptInterface.reloadTranscript()
        })
        //
        $('#sendButton').show()
        $('#stageChooser').show()
        $('#reload').show()
        $('#sendButton').on('click', () => {
            $('#playControls').show()
            const stage = stages[parseInt($('#stageChooser').val())]
            stage.$parent.parent().show()
            $('#video-'+parseInt($('#stageChooser').val())).removeClass('enabled')
            $('#video-'+parseInt($('#stageChooser').val())).addClass('enabled')
            const h = stage.$parent.parent().find('.stage-title').text()
            stage.$parent.parent().find('.stage-title').text(h + ' / ' + wordInfo.getHistory())
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
    $('#playControls').hide()
    $('#selectAllButton').hide()
    $('#reload').hide()
    $('#sendButton').hide()
    $('#stageChooser').hide()
    // set up stage
    buildStage($('#stages'), $('#video-1'))
    buildStage($('#stages'), $('#video-2'))
    buildStage($('#stages'), $('#video-3'))
    $('#video-1').hide()
    $('#video-2').hide()
    $('#video-3').hide()
    //$('#interval').hide()
    $('#playButton').on('click', () => {
        spirit.updateBPM(parseInt($('#bpm').val()))
        $.each(stages, function (key, stage) {
            stage.getCurrentSequence()
        })
        spirit.playOnBeat()
    })
    // enable video
    $('#enableVideo').on('click', () => {
        console.log('enabling video')
        $.each(stages, function (key, stage) {
            stage.loadVideoClips()
        })
        $('#video-1').show()
        $('#video-2').show()
        $('#video-3').show()
    })
    // download sequencer
    $('#downloadSequencers').on('click', () => {
        spirit.export()
    })
    $('#loadComposition').on('change', () => {
        //spirit.export()
        const file = $('#loadComposition').prop('files')[0]
        const reader = new FileReader()
        reader.addEventListener('load', (e) => {
            const data = JSON.parse(e.target.result)
            $('#playControls').show()
            //spirit.load(data)
            $('#bpm').val(data.bpm)
            for (const [seqId, seq] of data.sequencers.entries()) {
                const stage = stages[seqId]
                if (Object.keys(seq.samples).length) {
                    stage.$parent.parent().show()
                    $('#video-'+seqId).removeClass('enabled')
                    $('#video-'+seqId).addClass('enabled')
                    for (const samId of seq.sequence) {
                        const d = seq.samples[samId]
                        const $w = stage.makeWord(d).off()
                        stage.addRenderedWord($w)
                    }
                    stage.sequencer.load(seq)
                    stage.$parent.parent().find('.form-group input.volume').val(seq.volume)
                    stage.$parent.parent().find('.form-group select.interval').val(seq.interval)
                    stage.$parent.parent().find('.form-group input.offset').val(seq.offset)
                }
            }
        })
        reader.readAsText(file)
    })
    // expand and contract stage
    $('#expandButton').on('click', () => {
        if ($('#leftSide').hasClass('col-2')) {
            $('body').addClass('expanded')
            $('#middleSide').hide()
            $('#leftSide').removeClass('col-2')
            $('#leftSide').addClass('col-10')
        } else {
            $('body').removeClass('expanded')
            $('#middleSide').show()
            $('#leftSide').removeClass('col-10')
            $('#leftSide').addClass('col-2')
            $('#video-1').hide()
            $('#video-2').hide()
            $('#video-3').hide()
            $.each(stages, function (key, stage) {
                stage.sequencer.useSampler('audio')
            })
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

    // multi-word highlighting
    document.addEventListener('mouseup', event => {  
        if (window.getSelection().toString().length){
           const els = getSelectedElementTags(window)
           let phrase = []
           for (const el of els) {
               const $el = $(el)
               if ($el.hasClass('w')) {
                   $el.addClass('selected')
                   phrase.push($el)
               }
           }
           wordInfo.setActivePhrase(phrase)
        }
    })
}


function rangeIntersectsNode(range, node) {
    var nodeRange;
    if (range.intersectsNode) {
        return range.intersectsNode(node)
    } else {
        nodeRange = node.ownerDocument.createRange()
        try {
            nodeRange.selectNode(node)
        } catch (e) {
            nodeRange.selectNodeContents(node)
        }
        return range.compareBoundaryPoints(Range.END_TO_START, nodeRange) == -1 &&
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) == 1
    }
}

function getSelectedElementTags(win) {
    var range, sel, elmlist, treeWalker, containerElement
    sel = win.getSelection()
    if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0)
    }

    if (range) {
        containerElement = range.commonAncestorContainer
        if (containerElement.nodeType != 1) {
            containerElement = containerElement.parentNode
        }

        treeWalker = win.document.createTreeWalker(
            containerElement,
            NodeFilter.SHOW_ELEMENT,
            function(node) { return rangeIntersectsNode(range, node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; },
            false
        )

        elmlist = [treeWalker.currentNode]
        while (treeWalker.nextNode()) {
            elmlist.push(treeWalker.currentNode)
        }

        return elmlist
    }
}

start();