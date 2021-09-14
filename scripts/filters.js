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

// Word info panel for filtering and sorting
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

    getLeadingTrailing() {
        const $mEle = $('#filter-modal .modal-footer .leading-trailing')
        const before = parseInt($mEle.find('input.before').val())
        const after = parseInt($mEle.find('input.after').val())
        return [before, after]
    }

    hideFields(names) {
        this.$info.find('#makePhrase').hide()
        this.$info.find('table tbody tr').show()
        for (const name of names) {
            this.$info.find(name).hide()
        }
    }

    setActivePhrase(phrase) {
        if (phrase.length==1) {
            return this.setActiveWord(phrase[0])
        }
        const that = this
        let pattern = []
        let words = []
        let pos = ''
        for (const $ele of phrase) {
            words.push($ele.data('word'))
            pattern.push($ele.data('pos').map(p =>'#'+p).join('+'))
            pos += `<b>${$ele.data('word')}</b><br/>${$ele.data('pos').join(', ')}<br/>`
        }
        this.hideFields(['.info_features', '.info_length', '.info_duration', '.info_time', '.info_time2', '.info_syllables', '.info_syllableLengths', '.info_syllableSpeed', '.info_phones', '.info_phoneList', '.info_phoneSpeed', '.info_letters'])
        this.$info.find('#makePhrase').show()
        
        $('#makePhrase').one('click', debounce(() => {
            if (!phrase[0].hasClass('p')) { 
                that.words.makePhrase(phrase)
            }
            phrase[0].addClass('p')
            this.setActiveWord(phrase[0])
        }))
        this.$info.find('.card__header > p').text(words.join(' '))
        this.$info.find('.info_pos > td').show().html(pos)
        this.handlePos(pattern.join(' '))
    }

    setAudioFeatures($ele) {
        if ($ele.data('rms')) {
            this.$info.find('.rms').show()
            this.$info.find('.info_features.rms > td').text($ele.data('rms').toFixed(4))
        }
        if ($ele.data('zcr')) {
            this.$info.find('.zcr').show()
            this.$info.find('.info_features.zcr > td').text($ele.data('zcr').toFixed(2))
        }
        if ($ele.data('spectralSlope')) {
            this.$info.find('.spectralSlope').show()
            this.$info.find('.info_features.spectralSlope > td').text(($ele.data('spectralSlope')*100000000).toFixed(2))
        }
        if ($ele.data('mfcc')) {
            this.$info.find('.mfcc').show()
            //const a = Math.atan2($ele.data('mfcc')[1], $ele.data('mfcc')[0]) * 180
            //const d = Math.sqrt($ele.data('mfcc')[1]*$ele.data('mfcc')[1] + $ele.data('mfcc')[0]+$ele.data('mfcc')[0])
            //this.$info.find('.info_features.mfcc > td').text(a + ', ' + d + ', ' + $ele.data('mfcc').map(p => p.toFixed(2)).join(', '))
            this.$info.find('.info_features.mfcc > td').text($ele.data('mfcc').map(p => p.toFixed(2)).join(', '))
        }
        this.handleAudioFeatures($ele.data('rms'), $ele.data('zcr'), $ele.data('spectralSlope'))
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
            this.hideFields(['.info_features', '.info_length', '.info_syllables', '.info_syllableLengths', '.info_syllableSpeed', '.info_phones', '.info_phoneList', '.info_phoneSpeed', '.info_letters'])
        } else {
            this.hideFields(['.info_features'])
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
        this.setAudioFeatures($ele)
        //
        this.handleWord($ele.data('word'))
        this.handleDuration(duration)
        this.handleLength(length)
        this.handlePhones(phones, $ele)
        this.handleSyllables(sylls, syllDurs, $ele)
        this.handleTime($ele.data('start').toFixed(2), $ele.data('start2').toFixed(2))
        this.handlePos($ele.data('pos'))
        this.handleLetters(counts.join(', '))
    }

    handleWord(word) {
        const stemmed = (patterns, word) => {
            for (const pattern of patterns) {
                if (pattern.startsWith('-') && word.endsWith(pattern.substring(1))) {
                    return true
                } else if (pattern.endsWith('-') && word.startsWith(pattern.slice(0,-1))) {
                    return true
                } 
            }
            return false
        }
        this.$info.find('.card__header').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .word')
            $mEle.show()
            $mEle.find('input.find-word').val(word)
            $mEle.find('button.keep').on('click', () => {
                const opt = $mEle.find('input.find-word').val().split(',').map(p => p.trim())
                this.history.filters.push(`including ${$mEle.find('input').val()}`)
                this.words.filter((word) => {
                    return opt.includes(word.data('word')) || stemmed(opt, word.data('word'))
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.remove').on('click', () => {
                const opt = $mEle.find('input.find-word').val().split(',').map(p => p.trim())
                this.history.filters.push(`with ${$mEle.find('input').val()} removed`)
                this.words.filter((word) => {
                    return opt.includes(word.data('word')) || stemmed(opt, word.data('word'))
                }, false, this.getLeadingTrailing())
            })
            $mEle.find('button.keep-common').on('click', () => {
                const opt = $mEle.find('input.common-words').val()
                this.history.filters.push(`keeping ${opt} most common words`)
                const words = this.words.commonWords(parseInt(opt))
                this.words.filter((word) => {
                    return words.includes(word.data('word'))
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.remove-common').on('click', () => {
                const opt = $mEle.find('input.common-words').val()
                this.history.filters.push(`removing  ${opt} most common words`)
                const words = this.words.commonWords(parseInt(opt))
                this.words.filter((word) => {
                    return words.includes(word.data('word'))
                }, false, this.getLeadingTrailing())
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
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('.global button.after').on('click', () => {
                const opt = $mEle.find('.global input').val()
                this.history.filters.push(`after ${$mEle.find('input').val()}`)
                this.words.filter((word) => {
                    return word.data('start') >= parseFloat(opt)
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('.local button.before').on('click', () => {
                const opt = $mEle.find('.local input').val()
                this.history.filters.push(`before ${$mEle.find('input').val()} in each sentence`)
                this.words.filter((word) => {
                    return word.data('start2') <= parseFloat(opt)
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('.local button.after').on('click', () => {
                const opt = $mEle.find('.local input').val()
                this.history.filters.push(`after ${$mEle.find('input').val()} in each sentence`)
                this.words.filter((word) => {
                    return word.data('start2') >= parseFloat(opt)
                }, true, this.getLeadingTrailing())
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
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.longer').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words longer than ${$mEle.find('input').val()}s`)
                this.words.filter((word) => {
                    return word.data('end') - word.data('start') >= parseFloat(opt)
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.within').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words lasting within .1s of ${$mEle.find('input').val()}s`)
                this.words.filter((word) => {
                    const d = word.data('end') - word.data('start')
                    return d >= parseFloat(opt) - 0.05 && d <= parseFloat(opt) + 0.05   
                }, true, this.getLeadingTrailing())
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
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.longer').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`words longer than ${$mEle.find('input').val()} letters`)
                this.words.filter((word) => {
                    return !word.data('pos').includes('Sound') && word.data('word').length >= parseInt(opt)
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.within').on('click', () => {
                const opt = $mEle.find('input').val()
                this.history.filters.push(`${$mEle.find('input').val()} letter words`)
                this.words.filter((word) => {
                    return !word.data('pos').includes('Sound') && word.data('word').length == parseInt(opt)   
                }, true, this.getLeadingTrailing())
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
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('.extract button.this').on('click', () => {
                $w.trigger('focusPhones', [$mEle.find('.extract select').val(), $mEle.find('.extract input').val()])
            })
            $mEle.find('.extract button.all').on('click', () => {
                this.words.trigger('focusPhones', [$mEle.find('.extract select').val(), $mEle.find('.extract input').val()])
            })
        })
    }

    handleSyllables(sylls, syllDurs, $w) {
        const stressedIdx = (a) => {
            return (a.length) ? a.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0) : -1
        }
        this.$info.find('.info_syllables, .info_syllableLengths, .info_syllableSpeeds').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .syllables')
            const stressed = stressedIdx(syllDurs) + 1
            $mEle.find('.num-syllables input').val(syllDurs.length)
            $mEle.find('.stress input').val(stressed)
            $mEle.show()
            $mEle.find('.num-syllables button').on('click', () => {
                const kind = $mEle.find('.num-syllables select').val()
                const opt = parseInt($mEle.find('.num-syllables input').val())
                this.history.filters.push(`words with ${kind} ${opt} syllables`)
                this.words.filter((word) => {
                    const sy = syllables(word.data('phones'))
                    if (kind=="more than") {
                        return sy.length > opt
                    } else if (kind=="less than") {
                        return sy.length < opt
                    } else if (kind=="exactly") {
                        return sy.length == opt
                    }
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('.stress button').on('click', () => {
                const kind = $mEle.find('.stress select').val()
                const opt = parseInt($mEle.find('.stress input').val())
                if (kind=='custom') {
                    this.history.filters.push(`words with syllable ${opt} stressed`)
                } else {
                    this.history.filters.push(`words with ${kind} syllable stressed`)
                }
                this.words.filter((word) => {
                    const sy = syllables(word.data('phones'))
                    const syDurs = sy.map(s => s.map(p => p[1]).reduce((a, b) => a + b)).map(s => s.toFixed(2))
                    const sIdx = stressedIdx(syDurs) + 1
                    if (kind=="custom") {
                        return sIdx == opt
                    } else if (kind=="first") {
                        return sIdx == 1
                    } else if (kind=="last") {
                        return syDurs.length && sIdx == syDurs.length
                    }
                }, true, this.getLeadingTrailing())
            })
            $mEle.find('button.slow-to-fast').on('click', () => {
                this.history.sort.push(`slow to fast words`)
                this.words.sort((a, b) => {
                    return syllables(a.data('phones')).length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) > syllables(b.data('phones')).length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
                })
            })
            $mEle.find('button.fast-to-slow').on('click', () => {
                this.history.sort.push(`fast to slow words`)
                this.words.sort((a, b) => {
                    return syllables(a.data('phones')).length/(parseFloat(a.data('end')) - parseFloat(a.data('start'))) < syllables(b.data('phones')).length/(parseFloat(b.data('end')) - parseFloat(b.data('start')))
                })
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
                        }, keep, this.getLeadingTrailing())
                    } else {
                        this.words.filter((word) => {
                            return pattern[0].split(',').some(r=> word.data('pos').includes(r.substring(1)))
                        }, keep, this.getLeadingTrailing())
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
                }, true, this.getLeadingTrailing())
            })
        })
    }  
    
    handleAudioFeatures(rms, zcr, ss) {
        this.$info.find('.info_features').on('click', () => {
            this.openModal()
            const $mEle = $('#filter-modal .modal-body .audioFeatures')
            $mEle.show()
            $mEle.find('button.rms-asc').on('click', () => {
                this.history.sort.push(`low to high energy`)
                this.words.sort((a, b) => {
                    return a.data('rms') > b.data('rms')
                })
            }) 
            $mEle.find('button.rms-desc').on('click', () => {
                this.history.sort.push(`high to low energy`)
                this.words.sort((a, b) => {
                    return a.data('rms') < b.data('rms')
                })
            })  
            $mEle.find('button.zcr-asc').on('click', () => {
                this.history.sort.push(`more to less pitchy`)
                this.words.sort((a, b) => {
                    return a.data('zcr') > b.data('zcr')
                })
            }) 
            $mEle.find('button.zcr-desc').on('click', () => {
                this.history.sort.push(`less to more pitchy`)
                this.words.sort((a, b) => {
                    return a.data('zcr') < b.data('zcr')
                })
            })  
            $mEle.find('button.ss-asc').on('click', () => {
                this.history.sort.push(`low to high spectral slope`)
                this.words.sort((a, b) => {
                    return a.data('spectralSlope') > b.data('spectralSlope')
                })
            }) 
            $mEle.find('button.ss-desc').on('click', () => {
                this.history.sort.push(`high to low spectral slope`)
                this.words.sort((a, b) => {
                    return a.data('spectralSlope') < b.data('spectralSlope')
                })
            })  
            $mEle.find('button.mfcc-asc').on('click', () => {
                this.history.sort.push(`by mfcc`)
                this.words.sort((a, b) => {
                    return Math.atan2(a.data('mfcc')[1], a.data('mfcc')[0]) * 180 / Math.PI < Math.atan2(b.data('mfcc')[1], b.data('mfcc')[0]) * 180 / Math.PI
                    //return Math.round(a.data('mfcc')[0])  > Math.round(b.data('mfcc')[0])
                    //return Math.round(a.data('mfcc')[0]/10)*10 + a.data('mfcc')[1] > Math.round(b.data('mfcc')[0]/10)*10 + b.data('mfcc')[1]
                })
            }) 
            $mEle.find('button.mfcc-desc').on('click', () => {
                this.history.sort.push(`by mfcc (reverse)`)
                this.words.sort((a, b) => {
                    return Math.atan2(a.data('mfcc')[1], a.data('mfcc')[0]) * 180 / Math.PI < Math.atan2(b.data('mfcc')[1], b.data('mfcc')[0]) * 180 / Math.PI
                    //return Math.round(a.data('mfcc')[0]/10)*10 + a.data('mfcc')[1] < Math.round(b.data('mfcc')[0]/10)*10 + b.data('mfcc')[1]
                })
            })  
        })
    }
}
