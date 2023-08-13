import { $$, setFormControlValue } from './dom.js'
import { getState } from './state.js'


const $settings = $$('#settings [data-for')

const {
    updateSettings,
    ...settings
} = getState()

$settings.forEach(el => {
    const settingKey = el.getAttribute('data-for')
    const actualSettingValue = settings[settingKey]

    // Configuracion inicial
    setFormControlValue(el, actualSettingValue)
    const isSelect = el.nodeName === 'SELECT'
    const isCheckbox = el.nodeName === 'INPUT' && el.type === 'checkbox'

    if ( isSelect ){
        const optionToSelect = el.querySelector(`option[value="${actualSettingValue}"]`)
        if (!optionToSelect) return console.warn('[settings] not found') 
        
        optionToSelect.setAttribute('selected', '')
    }

    if ( isCheckbox ) el.checked = actualSettingValue
    else el.value = actualSettingValue

    // Escuchar eventos al cambiar la configuracion
    el.addEventListener('change', ({target}) => {
    const { checked, value } = target
    const isNumber = target.getAttribute('type') === 'number'
    
    let settingValue = typeof checked === 'boolean' ? checked : value
    if ( isNumber ) settingValue = +value

    updateSettings({
        key: settingKey,
        value: settingValue
    }) 
    })
})