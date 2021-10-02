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
    const wordInfo = new WordInfoInterface($('#wordInfo'), transcriptInterface)
    $("#transcript").on('wordSelected', (event, $w) => {
        setActiveInterface(transcriptInterface)
        wordInfo.setActiveWord($w)
        //transcriptInterface.playTranscriptSegment($w.parent(), $w)
    })
    
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
    $('#stopButton').on('click', () => {
        spirit.updateBPM(parseInt($('#bpm').val()))
        spirit.pause()
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
                    if (seq.interval.endsWith('hz')) {
                        stage.$parent.parent().find('.form-group select.interval').val('custom wpm')
                        stage.$parent.parent().find('.form-group select.customInterval').val(parseFloat(seq.interval.slice(0, -2))*60)
                    } else {
                        stage.$parent.parent().find('.form-group select.interval').val(seq.interval)
                    }
                    stage.$parent.parent().find('.form-group input.offset').val(seq.offset)
                    stage.sequencer.setInterval(seq.interval, seq.offset)
                    if (seq.rate) {
                        stage.$parent.parent().find('.form-group input.rate').val(seq.rate)
                    }
                    if (seq.pitch) {
                        stage.$parent.parent().find('.form-group input.pitch').val(seq.pitch)
                    }
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