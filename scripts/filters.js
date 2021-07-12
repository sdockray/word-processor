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
        this.$filterList.append($('<option></option>').attr('value', 'word speed').text('word speed'))
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
        let field = $('<input>').val(title)
        field.change((e) => {
            callback(e.target.value)
        })
        field.focus(() => field.val(""))
        this.$opts.append(field)
    }

    addSubmit(callback) {
        let submit = $('<button>').text('process')
        this.$opts.append(submit)
        submit.on('click', callback)
    }

    handle(mode) {
        let kind = false
        let opt = false
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
                })
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
                'ch-': { 'phones': 'ch', 'kind': 'start' },
                'gr-': { 'phones': 'g,r', 'kind': 'start' },
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
                })
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
                })
                this.reset()
            })
        }
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
        this.$sorterList.append($('<option></option>').attr('value', 'starting sound ascending').text('starting sound ascending'))
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
                return a.data('phones').length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) > b.data('phones').length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
            })
            this.reset()
        }
        else if (mode=="fast to slow") {
            this.words.sort((a, b) => {
                return a.data('phones').length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) < b.data('phones').length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
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