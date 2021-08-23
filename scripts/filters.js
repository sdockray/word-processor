const syllables = phonemes => {
    const vowels = ['aa', 'ae', 'ah', 'ao', 'aw', 'ay', 'eh', 'er', 'ey', 'ih', 'iy', 'ow', 'oy', 'uh', 'uw']
    const sounds = phonemes.map(p => (vowels.includes(p[0])) ? 'v' : 'c').join('')
    let s = sounds
    let counts = []
    let sylls = []
    let offset = s.length
    while (s.length>0) {
        if (s.endsWith('cvcc') || s.endsWith('cccv')) {
            counts.push(s.slice(-4))
            offset -= 4
            sylls.push(phonemes.slice(offset, offset + 4))
            s = s.slice(0, s.length-4)
        } else if (s.endsWith('ccv') || s.endsWith('cvc') || s.endsWith('vcc')) {
            counts.push(s.slice(-3))
            offset -= 3
            sylls.push(phonemes.slice(offset, offset + 3))
            s = s.slice(0, s.length-3)
        } else if (s.endsWith('cv') || s.endsWith('vc')) {
            counts.push(s.slice(-2))
            offset -= 2
            sylls.push(phonemes.slice(offset, offset + 2))
            s = s.slice(0, s.length-2)
        } else if (s.endsWith('v')) {
            counts.push(s.slice(-1))
            offset -= 1
            sylls.push(phonemes.slice(offset, offset + 1))
            s = s.slice(0, s.length-1)
        } else {
            counts.push(s)
            sylls.push(phonemes.slice(0, offset))
            s = ''
        }
    }
    return sylls.reverse()
}

class FilterInterface {
    constructor($parent, words) {
        this.words = words
        this.$filterList = $('<select>')
        this.$opts = $('<div>')
        $parent.append(this.$filterList)
        $parent.append(this.$opts)
        this.$filterList.append('<option selected="true" disabled>filter...</option>')
        this.$filterList.prop('selectedIndex', 0)
        this.$filterList.append($('<option></option>').attr('value', 'word length').text('word length'))
        this.$filterList.append($('<option></option>').attr('value', 'phoneme').text('phoneme'))
        this.$filterList.append($('<option></option>').attr('value', 'syllables').text('syllables'))
        this.$filterList.append($('<option></option>').attr('value', 'word speed').text('word speed'))
        this.$filterList.append($('<option></option>').attr('value', 'language').text('language'))
        this.$filterList.change((e) => {
            this.handle(e.target.value)
        })
    }

    hide() {
        this.$filterList.hide()
    }

    show() {
        this.$filterList.show()
    }

    reset() {
        this.$opts.empty()
        this.$filterList.prop('selectedIndex', 0)
    }

    addSelectOption(title, opts, callback) {
        let dropdown = $('<select>')
        dropdown.empty()
        dropdown.append('<option selected="true" disabled>' + title + '</option>')
        $.each(opts, function (key, entry) {
            dropdown.append($('<option></option>').attr('value', key).text(entry))
        })
        dropdown.prop('selectedIndex', 0)
        dropdown.change((e) => {
            callback(e.target.value)
        })
        this.$opts.append(dropdown)
    }

    addFieldOption(title, callback) {
        let field = $('<input>').attr('type', 'text').val(title)
        if (title=="before" || title=="after") {
            field.addClass('narrow')
        }
        field.change((e) => {
            callback(e.target.value)
        })
        field.focus(() => field.val(""))
        this.$opts.append(field)
    }

    addCheckbox(title, callback) {
        let field = $('<input type="checkbox" id="' + title + '" value="remove">')
        let label = $('<label for="'+ title + '">' + title + '</label>')
        field.change((e) => {
            callback(e.target.value)
        })
        this.$opts.append(field).append(label)
    }

    addSubmit(callback) {
        let submit = $('<button>').text('process')
        this.$opts.append(submit)
        submit.on('click', callback)
    }

    handle(mode) {
        let kind = false
        let opt = false
        let before = 0
        let after = 0
        let keep = 1
        if (mode=="word length") {
            this.addSelectOption('what kind?', {'min': 'Minimum word length is', 'max': 'Maximum word length is'}, (val) => {
                kind = val
            })
            this.addFieldOption('how many letters', (val) => {
                opt = val 
            })
            this.addSubmit(() => {
                this.words.filter((word) => {
                    if (kind=="min") {
                        return word.data('word').length > parseInt(opt)
                    } else if (kind=="max") {
                        return word.data('word').length - 1 <= parseInt(opt)
                    }
                }, keep, [before, after])
                this.reset()
            })
        } else if (mode=="phoneme") {
            this.addSelectOption('where?', {'start': 'at the start', 'end': 'at the end', 'anywhere': 'anywhere in the word'}, (val) => {
                kind = val
            })
            this.addFieldOption('which phoneme(s)? comma separated, plz', (val) => {
                opt = val.replace(' ', '')
            })
            const premade = {
                '-ing': { 'phones': 'ih,ng', 'kind': 'end' },
                '-ly': { 'phones': 'l,iy', 'kind': 'end' },
                '-ide': { 'phones': 'ay,d', 'kind': 'end' },
                '-ism': { 'phones': 'ih,z,ah,m', 'kind': 'end' },
                'ch-': { 'phones': 'ch', 'kind': 'start' },
                'com-': { 'phones': 'k,ah,m', 'kind': 'start' },
                'dis-': { 'phones': 'd,ih,s', 'kind': 'start' },
                'gr-': { 'phones': 'g,r', 'kind': 'start' },
                're-': { 'phones': 'r,iy', 'kind': 'start' },
                '-ee-': { 'phones': 'iy', 'kind': 'anywhere' },
                '-ow-': { 'phones': 'aw', 'kind': 'anywhere' },
                '-uh-': { 'phones': 'ah', 'kind': 'anywhere' },
                '-augh-': { 'phones': 'ao', 'kind': 'anywhere' },
                '-oh-': { 'phones': 'ow', 'kind': 'anywhere' }
            }
            let premadeOptions = {}
            Object.keys(premade).forEach(key => premadeOptions[key] = key);
            this.addSelectOption('or choose predefined', premadeOptions, (val) => {
                opt = premade[val]['phones']
                kind = premade[val]['kind']
            })
            this.addSubmit(() => {
                this.words.filter((word) => {
                    const phones = word.data('phones').map(p => p[0]).join(',')
                    if (kind=="start") {
                        return phones.startsWith(opt)
                    } else if (kind=="end") {
                        return phones.endsWith(opt)
                    } else if (kind=="anywhere") {
                        return phones.includes(opt)
                    }
                }, keep, [before, after])
                this.reset()
            })
        } else if (mode=="word speed") {
            this.addSelectOption('what kind?', {'min': 'Minimum speed is', 'max': 'Maximum speed is'}, (val) => {
                kind = val
            })
            this.addFieldOption('Phonemes per second (eg: 12.5)', (val) => {
                opt = parseFloat(val)
            })
            this.addSubmit(() => {
                this.words.filter((word) => {
                    const pps = word.data('phones').length/(parseFloat(word.data('end')) - parseFloat(word.data('start')))
                    if (kind=="min") {
                        return pps >= opt
                    } else if (kind=="max") {
                        return pps <= opt
                    }
                }, keep, [before, after])
                this.reset()
            })
        } else if (mode=="syllables") {
            this.addSelectOption('what kind?', {'count': 'How many', 'min speed': 'Syllables per second (min)', 'max speed': 'Syllables per second (max)', }, (val) => {
                kind = val
            })
            this.addFieldOption('value', (val) => {
                opt = val
            })
            this.addSubmit(() => {
                this.words.filter((word) => {
                    const sylls = syllables(word.data('phones'))
                    if (kind=="count") {
                        return sylls.length == parseInt(opt)
                    } else if (kind=="min speed") {
                        return sylls.length/(parseFloat(word.data('end')) - parseFloat(word.data('start'))) >= parseFloat(opt)
                    } else if (kind=="max speed") {
                        return sylls.length/(parseFloat(word.data('end')) - parseFloat(word.data('start'))) <= parseFloat(opt)
                    }
                }, keep, [before, after])
                this.reset()
            })
        } else if (mode=="language") {
            this.addSelectOption('Keep:', {
                'nouns': 'nouns', 
                'singular nouns': 'singular nouns', 
                'plural nouns': 'plural nouns',
                'person': 'person',
                'sounds': 'sounds',
                'custom': 'a pattern -->'
            }, (val) => {
                kind = val
                if (val=='custom') {
                    this.addFieldOption('enter the pattern (#Noun #Verb #Noun #Verb)', (val) => {
                        opt = val
                    })
                }
            })
            this.addSubmit(() => {
                if (kind=='custom') {
                    const pattern = opt.split(' ')
                    this.words.filter_sequence((word, idx) => {
                        if (pattern[idx].charAt(0)=='#') {
                            // @TODO: multipleconditions, commas separated
                            return word.data('pos').includes(pattern[idx].substring(1))
                        } else {
                            return word.data('word')==pattern[idx].toLowerCase()
                        }
                    }, pattern.length)
                } else {
                    this.words.filter((word) => {
                        if (kind=="nouns") {
                            return word.data('pos').includes('Noun')
                        } else if (kind=="singular nouns") {
                            return word.data('pos').includes('Noun') && word.data('pos').includes('Singular')
                        } else if (kind=="plural nouns") {
                            return word.data('pos').includes('Noun') && word.data('pos').includes('Plural')
                        } else if (kind=="person") {
                            return word.data('pos').includes('Person')
                        } else if (kind=="sounds") {
                            return word.data('pos').includes('Sound')
                        }
                    }, keep, [before, after])
                }
                this.reset()
            })
        }

        this.addFieldOption('before', (val) => {
            if (val!='before') {
                before = parseInt(val) 
            }
        })
        this.addFieldOption('after', (val) => {
            if (val!='after') {
                after = parseInt(val) 
            }
        })
        this.addCheckbox('remove', (val) => {
            if (val!='remove') {
                keep = 1 
            } else {
                keep = 0
            }
        })
    }
}

class SorterInterface {
    constructor($parent, words) {
        this.words = words
        this.$sorterList = $('<select>')
        $parent.append(this.$sorterList)
        this.$sorterList.append('<option selected="true" disabled>sort...</option>')
        this.$sorterList.prop('selectedIndex', 0)
        this.$sorterList.append($('<option></option>').attr('value', 'alphabetical').text('alphabetical'))
        this.$sorterList.append($('<option></option>').attr('value', 'reverse alphabetical').text('reverse alphabetical'))
        this.$sorterList.append($('<option></option>').attr('value', 'long to short').text('long to short'))
        this.$sorterList.append($('<option></option>').attr('value', 'short to long').text('short to long'))
        this.$sorterList.append($('<option></option>').attr('value', 'fast to slow').text('fast to slow'))
        this.$sorterList.append($('<option></option>').attr('value', 'slow to fast').text('slow to fast'))
        this.$sorterList.append($('<option></option>').attr('value', 'syllables ascending').text('syllables ascending'))
        this.$sorterList.append($('<option></option>').attr('value', 'syllables descending').text('syllables descending'))
        this.$sorterList.append($('<option></option>').attr('value', 'starting sound descending').text('starting sound descending'))
        this.$sorterList.append($('<option></option>').attr('value', 'ending sound ascending').text('ending sound ascending'))
        this.$sorterList.append($('<option></option>').attr('value', 'ending sound descending').text('ending sound descending'))
        this.$sorterList.append($('<option></option>').attr('value', 'by original sequence').text('by original sequence'))
        this.$sorterList.append($('<option></option>').attr('value', 'by reverse original sequence').text('by reverse original sequence'))
        this.$sorterList.change((e) => {
            this.handle(e.target.value)
        })
    }

    hide() {
        this.$sorterList.hide()
    }

    show() {
        this.$sorterList.show()
    }

    reset() {
        this.$sorterList.prop('selectedIndex', 0)
    }

    handle(mode) {
        if (mode=="alphabetical") {
            this.words.sort((a, b) => {
                return a.data('word').toLowerCase() > b.data('word').toLowerCase()
            })
            this.reset()
        }
        else if (mode=="reverse alphabetical") {
            this.words.sort((a, b) => {
                return a.data('word').toLowerCase() < b.data('word').toLowerCase()
            })
            this.reset()
        }
        else if (mode=="long to short") {
            this.words.sort((a, b) => {
                return a.data('word').length > b.data('word').length
            })
            this.reset()
        }
        else if (mode=="short to long") {
            this.words.sort((a, b) => {
                return a.data('word').length < b.data('word').length
            })
            this.reset()
        }
        else if (mode=="slow to fast") {
            this.words.sort((a, b) => {
                //return a.data('phones').length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) > b.data('phones').length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
                return syllables(a.data('phones')).length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) > syllables(b.data('phones')).length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
            })
            this.reset()
        }
        else if (mode=="fast to slow") {
            this.words.sort((a, b) => {
                //return a.data('phones').length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) < b.data('phones').length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
                return syllables(a.data('phones')).length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) < syllables(b.data('phones')).length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
            })
            this.reset()
        } else if (mode=="syllables ascending") {
            this.words.sort((a, b) => {
                return syllables(a.data('phones')).length > syllables(b.data('phones')).length
            })
            this.reset()
        } else if (mode=="syllables descending") {
            this.words.sort((a, b) => {
                return syllables(a.data('phones')).length < syllables(b.data('phones')).length
            })
            this.reset()
        } else if (mode=="starting sound ascending") {
            this.words.sort((a, b) => {
                return a.data('phones').map(p => p[0]).join(',') > b.data('phones').map(p => p[0]).join(',')
            })
            this.reset()
        } else if (mode=="starting sound descending") {
            this.words.sort((a, b) => {
                return a.data('phones').map(p => p[0]).join(',') < b.data('phones').map(p => p[0]).join(',')
            })
            this.reset()
        } else if (mode=="ending sound ascending") {
            this.words.sort((a, b) => {
                return a.data('phones').map(p => p[0]).reverse().join(',') > b.data('phones').map(p => p[0]).reverse().join(',')
            })
            this.reset()
        } else if (mode=="ending sound descending") {
            this.words.sort((a, b) => {
                return a.data('phones').map(p => p[0]).reverse().join(',') < b.data('phones').map(p => p[0]).reverse().join(',')
            })
            this.reset()
        } else if (mode=="by original sequence") {
            this.words.sort((a, b) => {
                return a.data('start') > b.data('start')
            })
            this.reset()
        }
        else if (mode=="by reverse original sequence") {
            this.words.sort((a, b) => {
                return a.data('start') < b.data('start')
            })
            this.reset()
        }
    }
}

class WordInfoInterface {
    constructor($parent, words) {
        this.words = words
        this.$info = $parent
        this.history = { transcript: '', filters: [], sort: [] }
    }

    startHistory(transcript) {
        this.history.transcript = transcript
    }

    getHistory() {
        let parts = [this.history.transcript, [...new Set(this.history.filters)].join(' - '), [...new Set(this.history.sort)].join(' - ')]
        let s = parts.join(' - ')
        this.history = { transcript: '', filters: [], sort: [] }
        return s
    }

    openModal() {
        window.location = (""+window.location).replace(/#[A-Za-z0-9_\-]*$/,'')+'#filter-modal'
        $('#filter-modal .modal-body > div').hide()
    }

    getLettersCount(str) {
        return [...str].reduce((res, char) => (res[char] = (res[char] || 0) + 1, res), {})
    }

    hideFields(names) {
        this.$info.find('table tbody tr').show()
        for (const name of names) {
            this.$info.find(name).hide()
        }
    }

    setActivePhrase(phrase) {
        let pattern = []
        let words = []
        let pos = ''
        for (const $ele of phrase) {
            words.push($ele.data('word'))
            pattern.push($ele.data('pos').map(p =>'#'+p).join('+'))
            pos += `<b>${$ele.data('word')}</b><br/>${$ele.data('pos').join(', ')}<br/>`
        }
        this.hideFields(['.info_length', '.info_duration', '.info_time', '.info_time2', '.info_syllables', '.info_syllableLengths', '.info_syllableSpeed', '.info_phones', '.info_phoneList', '.info_phoneSpeed', '.info_letters'])
        this.$info.find('.card__header > p').text(words.join(' '))
        this.$info.find('.info_pos > td').show().html(pos)
        this.handlePos(pattern.join(' '))
    }

    setActiveWord($ele) {
        this.$info.removeClass('u-none')
        const duration = $ele.data('end') - $ele.data('start')
        const length = $ele.data('word').length
        const sylls = syllables($ele.data('phones'))
        const syllDurs = sylls.map(s => s.map(p => p[1]).reduce((a, b) => a + b)).map(s => s.toFixed(2))
        const phones = $ele.data('phones').map(p => p[0])
        const letters = this.getLettersCount($ele.data('word'))
        //console.log(this.$info.find('.card__header > p'))
        if ($ele.data('pos').includes('Sound')) {
            this.hideFields(['.info_length', '.info_syllables', '.info_syllableLengths', '.info_syllableSpeed', '.info_phones', '.info_phoneList', '.info_phoneSpeed', '.info_letters'])
        } else {
            this.hideFields([])
        }
        this.$info.find('.card__header > p').text($ele.text())
        this.$info.find('.info_length > td').text(length)
        this.$info.find('.info_duration > td').text(duration.toFixed(3))
        this.$info.find('.info_time > td').text($ele.data('start').toFixed(2) + 's')
        this.$info.find('.info_time2 > td').text($ele.data('start2').toFixed(2) + 's')
        this.$info.find('.info_syllables > td').text(sylls.length)
        this.$info.find('.info_syllableLengths > td').text(syllDurs.join(', '))
        this.$info.find('.info_syllableSpeed > td').text((sylls.length/duration).toFixed(3) + " /s")
        this.$info.find('.info_phones > td').text(phones.length)
        this.$info.find('.info_phoneList > td').text(phones.join(','))
        this.$info.find('.info_phoneSpeed > td').text((phones.length/duration).toFixed(3) + " /s")
        this.$info.find('.info_pos > td').text($ele.data('pos').join(', '))
        //
        let keys = Object.keys(letters)
        keys.sort()
        let counts = []
        for (const key of keys) {
            counts.push(key + ":" + letters[key])
        }
        this.$info.find('.info_letters > td').text(counts.join(', '))
        //
        this.handleWord($ele.data('word'))
        this.handleDuration(duration)
        this.handleLength(length)
        this.handlePhones(phones, $ele)
        this.handleTime($ele.data('start').toFixed(2), $ele.data('start2').toFixed(2))
        this.handlePos($ele.data('pos'))
        this.handleLetters(counts.join(', '))
    }

    handleWord(word) {
        this.$info.find('.card__header').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .word')
            $mEle.show()
            $mEle.find('input').val(word)
            $mEle.find('button.keep').on('click', () => {
                const opt = $mEle.find('input').val().split(',').map(p => p.trim())
                this.history.filters.push(`including ${$mEle.find('input').val()}`)
                this.words.filter((word) => {
                    return opt.includes(word.data('word'))
                }, true, [0, 0])
            })
            $mEle.find('button.remove').on('click', () => {
                const opt = $mEle.find('input').val().split(',').map(p => p.trim())
                this.history.filters.push(`with ${$mEle.find('input').val()} removed`)
                this.words.filter((word) => {
                    return opt.includes(word.data('word'))
                }, false, [0, 0])
            })
            $mEle.find('button.alpha').on('click', () => {
                this.history.sort.push(`sorted alphabetically`)
                this.words.sort((a, b) => {
                    return a.data('word').toLowerCase() > b.data('word').toLowerCase()
                })
            })
            $mEle.find('button.r-alpha').on('click', () => {
                this.history.sort.push(`sorted reverse alphabetically`)
                this.words.sort((a, b) => {
                    return a.data('word').toLowerCase() < b.data('word').toLowerCase()
                })
            })
        })        
    }

    handleTime(s1, s2){
        this.$info.find('.info_time,.info_time2').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .time')
            $mEle.show()
            $mEle.find('.global input').val(s1)
            $mEle.find('.local input').val(s2)
            $mEle.find('.global button.before').on('click', () => {
                const opt = $mEle.find('.global input').val()
                this.history.filters.push(`before ${$mEle.find('input').val()}`)
                this.words.filter((word) => {
                    return word.data('start') <= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('.global button.after').on('click', () => {
                const opt = $mEle.find('.global input').val()
                this.history.filters.push(`after ${$mEle.find('input').val()}`)
                this.words.filter((word) => {
                    return word.data('start') >= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('.local button.before').on('click', () => {
                const opt = $mEle.find('.local input').val()
                this.history.filters.push(`before ${$mEle.find('input').val()} in each sentence`)
                this.words.filter((word) => {
                    return word.data('start2') <= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('.local button.after').on('click', () => {
                const opt = $mEle.find('.local input').val()
                this.history.filters.push(`after ${$mEle.find('input').val()} in each sentence`)
                this.words.filter((word) => {
                    return word.data('start2') >= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('button.chron').on('click', () => {
                this.history.sort.push(`sorted by original time`)
                this.words.sort((a, b) => {
                    return a.data('start') > b.data('start')
                })
            })
            $mEle.find('button.r-chron').on('click', () => {
                this.history.sort.push(`sorted in reverse by time`)
                this.words.sort((a, b) => {
                    return a.data('start') < b.data('start')
                })
            })
            $mEle.find('button.chron2').on('click', () => {
                this.history.sort.push(`sorted by time in sentence`)
                this.words.sort((a, b) => {
                    return a.data('start2') > b.data('start2')
                })
            })
            $mEle.find('button.r-chron2').on('click', () => {
                this.history.sort.push(`reverse sorted by time in sentence`)
                this.words.sort((a, b) => {
                    return a.data('start2') < b.data('start2')
                })
            })
        })
    }

    handleDuration(duration, $w){
        this.$info.find('.info_duration').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .duration')
            $mEle.show()
            $mEle.find('input').val(duration.toFixed(3))
            $mEle.find('button.shorter').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words shorter than ${$mEle.find('input').val()}s`)
                this.words.filter((word) => {
                    return word.data('end') - word.data('start') <= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('button.longer').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words longer than ${$mEle.find('input').val()}s`)
                this.words.filter((word) => {
                    return word.data('end') - word.data('start') >= parseFloat(opt)
                }, true, [0, 0])
            })
            $mEle.find('button.within').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words lasting within .1s of ${$mEle.find('input').val()}s`)
                this.words.filter((word) => {
                    const d = word.data('end') - word.data('start')
                    return d >= parseFloat(opt) - 0.05 && d <= parseFloat(opt) + 0.05   
                }, true, [0, 0])
            })
            $mEle.find('button.short-to-long').on('click', () => {
                this.history.sort.push(`shorter to longer duration words`)
                this.words.sort((a, b) => {
                    const ad = a.data('end') - a.data('start')
                    const bd = b.data('end') - b.data('start')
                    return ad > bd
                })
            })
            $mEle.find('button.long-to-short').on('click', () => {
                this.history.sort.push(`longer to shorter duration words`)
                this.words.sort((a, b) => {
                    const ad = a.data('end') - a.data('start')
                    const bd = b.data('end') - b.data('start')
                    return ad < bd
                })
            })
        })
    }

    handleLength(length){
        this.$info.find('.info_length').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .length')
            $mEle.show()
            $mEle.find('input').val(length)
            $mEle.find('button.shorter').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words shorter than ${$mEle.find('input').val()} letters`)
                this.words.filter((word) => {
                    return !word.data('pos').includes('Sound') && word.data('word').length <= parseInt(opt)
                }, true, [0, 0])
            })
            $mEle.find('button.longer').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words longer than ${$mEle.find('input').val()} letters`)
                this.words.filter((word) => {
                    return !word.data('pos').includes('Sound') && word.data('word').length >= parseInt(opt)
                }, true, [0, 0])
            })
            $mEle.find('button.within').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`${$mEle.find('input').val()} letter words`)
                this.words.filter((word) => {
                    return !word.data('pos').includes('Sound') && word.data('word').length == parseInt(opt)   
                }, true, [0, 0])
            })
            $mEle.find('button.short-to-long').on('click', () => {
                this.history.sort.push(`short to long words`)
                this.words.sort((a, b) => {
                    return a.data('word').length > b.data('word').length
                })
            })
            $mEle.find('button.long-to-short').on('click', () => {
                this.history.sort.push(`long to short words`)
                this.words.sort((a, b) => {
                    return a.data('word').length < b.data('word').length
                })
            })
        })
    }

    handlePhones(phones, $w){
        this.$info.find('.info_phones,.info_phoneList,.info_phoneSpeed').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .phonemes')
            $mEle.find('.filter input').val(phones.join(','))
            $mEle.show()
            $mEle.find('.filter button').on('click', () => {
                const kind = $mEle.find('.filter select').val()
                const opt = $mEle.find('.filter input').val().replace(' ', '')
                this.history.filters.push(`words with ${opt} at ${kind}`)
                this.words.filter((word) => {
                    const phones = word.data('phones').map(p => p[0]).join(',')
                    if (kind=="start") {
                        return phones.startsWith(opt)
                    } else if (kind=="end") {
                        return phones.endsWith(opt)
                    } else if (kind=="anywhere") {
                        return phones.includes(opt)
                    }
                }, true, [0, 0])
            })
            $mEle.find('.extract button.this').on('click', () => {
                $w.trigger('focusPhones', [$mEle.find('.extract select').val(), $mEle.find('.extract input').val()])
            })
            $mEle.find('.extract button.all').on('click', () => {
                this.words.trigger('focusPhones', [$mEle.find('.extract select').val(), $mEle.find('.extract input').val()])
            })
        })
    }


    handlePos(pos){
        this.$info.find('.info_pos').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .pos')
            if (Array.isArray(pos)) {
                $mEle.find('input').val(pos.map(p =>'#'+p).join(','))
            } else {
                $mEle.find('input').val(pos)
            }
            $mEle.show()
            const filterFunc = (opt, keep) => {
                const pattern = opt.split(' ')
                if (pattern.length==1) {
                    if (pattern[0].includes('+')) {
                        this.words.filter((word) => {
                            return pattern[0].split('+').every(r=> word.data('pos').includes(r.substring(1)))
                        }, keep, [0, 0])
                    } else {
                        this.words.filter((word) => {
                            return pattern[0].split(',').some(r=> word.data('pos').includes(r.substring(1)))
                        }, keep, [0, 0])
                    }
                } else {
                    this.words.filter_sequence((word, idx) => {
                        if (pattern[idx].charAt(0)=='#' && pattern[idx].includes('+')) {
                            //return word.data('pos').includes(pattern[idx].substring(1))
                            return pattern[idx].split('+').every(r=> word.data('pos').includes(r.substring(1)))
                        } else if (pattern[idx].charAt(0)=='#') {
                            return pattern[idx].split(',').some(r=> word.data('pos').includes(r.substring(1)))
                        } else {
                            return word.data('word')==pattern[idx].toLowerCase()
                        }
                    }, pattern.length)
                }
            }
            $mEle.find('button.keep').on('click', () => {
                this.history.filters.push(`keeping "${$mEle.find('input').val()}"`)
                filterFunc($mEle.find('input').val(), true)
            })
            $mEle.find('button.remove').on('click', () => {
                this.history.filters.push(`removing "${$mEle.find('input').val()}"`)
                filterFunc($mEle.find('input').val(), false)
            })
        })
    }    

    handleLetters(letters){
        this.$info.find('.info_letters').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .letters')
            $mEle.find('input').val(letters)
            $mEle.show()
            $mEle.find('button.keep').on('click', () => {
                const opt = $mEle.find('input').val().split(',').map(p => p.trim().split(':'))
                this.history.filters.push(`words with at least these letters "${$mEle.find('input').val()}"`)
                this.words.filter((word) => {
                    const letters = this.getLettersCount(word.data('word'))
                    return opt.every(r=> letters.hasOwnProperty(r[0]) && letters[r[0]] >= r[1])
                }, true, [0, 0])
            })
        })
    }        
}
