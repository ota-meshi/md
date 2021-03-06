'use strict'

const EventEmitter = require('events')
const Parser = require('@vuedoc/parser/lib/parser')

const tag = (level) => {
  let slog = ''

  if (level > 6) {
    level = 6
  }

  for (let i = 0; i < level; i++) {
    slog += '#'
  }

  return slog + ' '
}

const DEFAULT_LEVEL = 1
const DEFAULT_TITLES = {
  props: 'props',
  data: 'data',
  computed: 'computed properties',
  methods: 'methods',
  events: 'events',
  slots: 'slots'
}

const bold = (text) => `**${text}**`
const italic = (text) => `*${text}*`
// const underline = (text) => `_${text}_`
const backtick = (text) => `\`${text}\``
const item = (text) => `- ${text}`

const h = (text, level) => tag(level) + text
const comma = () => ','
const parenthesis = (text) => `(${text})`
const nline = () => '\n'

const parseValue = (value) => {
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false'

    case 'string':
      value = value.replace(/'/g, '\'')
      return `'${value}'`

    default:
      if (value === null) {
        return 'null'
      }
  }

  return value
}

const writer = {
  name (options, name) {
    options.$println(h(name, options.level++))
  },

  description (options, description) {
    options.$println(description)
    options.$println()
  },

  keywords (options, keywords) {
    options.$println()

    keywords.forEach((keyword) => {
      let line = bold(keyword.name)

      if (keyword.description) {
        line += ' - ' + keyword.description
      }

      options.$println(item(line))
    })

    options.$println()
  },

  props (options, props, title) {
    options.$println(h(title, options.level))

    props.forEach((prop) => {
      const type = prop.value.type || prop.value || 'any'
      const nature = prop.value.required ? 'required' : 'optional'
      const twoWay = prop.value.twoWay
      const defaultValue = parseValue(prop.value.default)

      options.$print(item(backtick(prop.name)))
      options.$print(bold(italic(type)))
      options.$print(parenthesis(italic(nature)))

      const line = []

      if (twoWay) {
        line[line.length - 1] += comma()

        options.$print(backtick(`twoWay = ${twoWay}`))
      }

      if (defaultValue) {
        options.$print(backtick(`default: ${defaultValue}`))
      }

      options.$println()

      if (prop.description) {
        options.$println(prop.description)
        options.$println()
      }
    })
  },

  data (options, data, title) {
    options.$println()
    options.$println(h(title, options.level))

    data.forEach((prop) => {
      const args = [
        item(backtick(prop.name))
      ]

      if (prop.description) {
        args.push(prop.description)
      }

      args.push(nline())
      args.push(italic('initial value:'))
      args.push(backtick(parseValue(prop.value)))

      options.$println.apply(null, args)
      options.$println()
    })
  },

  computed (options, props, title) {
    options.$println(h(title, options.level))

    props.forEach((prop) => {
      const args = [
        item(backtick(prop.name))
      ]

      if (prop.description) {
        args.push(prop.description)
      }

      if (prop.dependencies.length) {
        args.push(nline())
        args.push(italic('dependencies:'))

        prop.dependencies.forEach((item) => args.push(backtick(item)))
      }

      options.$println.apply(null, args)
      options.$println()
    })
  },

  methods (options, methods, title) {
    options.$println(h(title, options.level))

    methods.forEach((method) => {
      const params = method.params.map((param) => param.name).join(', ')

      options.$println(item(backtick(`${method.name}(${params})`)))

      if (method.description) {
        options.$println(method.description)
      }

      options.$println()
    })

    options.$println()
  },

  slots (options, slots, title) {
    options.$println(h(title, options.level))

    slots.forEach((slot) => {
      options.$println(item(backtick(slot.name)), slot.description)
      options.$println()
    })
  },

  events (options, events, title) {
    options.$println(h(title, options.level))

    events.forEach((event) => {
      options.$println(item(backtick(event.name)), event.description)
      options.$println()
    })
  }
}

module.exports.render = (component, options = {}) => {
  options.level = options.level || DEFAULT_LEVEL
  options.titles = options.titles || DEFAULT_TITLES
  options.features = options.features || Parser.SUPPORTED_FEATURES

  const emiter = new EventEmitter()

  options.$print = function () {
    Array.prototype.slice.call(arguments)
      .forEach((str) => emiter.emit('write', str + ' '))
  }

  options.$println = function () {
    options.$print.apply(null, Array.prototype.slice.call(arguments))
    emiter.emit('write', '\n')
  }

  process.nextTick(() => {
    options.features.forEach((node) => {
      if (component[node] === null || component[node].length === 0) {
        return options.$println()
      }

      const title = options.titles[node] || DEFAULT_TITLES[node]

      writer[node](options, component[node], title)
    })

    emiter.emit('end')
  })

  return emiter
}
