#!/usr/bin/env node

import PCRE2 from './lib/index.js'

async function runDemo() {
  console.log('🚀 PCRE2.wasm Demo\n')

  try {
    const pcre2 = new PCRE2()
    await pcre2.initialize()

    console.log('✅ PCRE2.wasm initialized successfully')

    // Check capabilities
    const capabilities = pcre2.getSystemCapabilities()
    console.log(`📊 SIMD Support: ${capabilities.wasmSimd ? '✅' : '❌'}`)
    if (!capabilities.wasmSimd) {
      throw new Error('WASM SIMD is required. Use Chrome/Edge 113+ with SIMD enabled.')
    }
    console.log(`📊 Build Variant: SIMD-optimized\n`)

    // Demo 1: Simple pattern matching
    console.log('📝 Demo 1: Email validation')
    const emailPattern = pcre2.compile('\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b')
    const emails = ['user@example.com', 'invalid-email', 'test@domain.org']

    for (const email of emails) {
      const isValid = emailPattern.test(email)
      console.log(`  ${email}: ${isValid ? '✅ Valid' : '❌ Invalid'}`)
    }
    emailPattern.destroy()

    // Demo 2: Capture groups
    console.log('\n📝 Demo 2: Date parsing with capture groups')
    const datePattern = pcre2.compile('(\\d{4})-(\\d{2})-(\\d{2})')
    const dateText = 'Today is 2023-12-25 and tomorrow is 2023-12-26'
    const matches = datePattern.execAll(dateText)

    for (const match of matches) {
      console.log(`  Date: ${match.matches[0]} (Year: ${match.matches[1]}, Month: ${match.matches[2]}, Day: ${match.matches[3]})`)
    }
    datePattern.destroy()

    // Demo 3: Pattern replacement
    console.log('\n📝 Demo 3: Phone number formatting')
    const phonePattern = pcre2.compile('(\\d{3})(\\d{3})(\\d{4})')
    const phoneNumbers = ['1234567890', '5551234567']

    for (const phone of phoneNumbers) {
      const result = phonePattern.replace(phone, '($1) $2-$3')
      if (result.success) {
        console.log(`  ${phone} → ${result.result}`)
      }
    }
    phonePattern.destroy()

    // Demo 4: Performance metrics
    console.log('\n📊 Performance Metrics:')
    const metrics = pcre2.getMetrics()
    console.log(`  Patterns compiled: ${metrics.patternsCompiled}`)
    console.log(`  Matches performed: ${metrics.matchesPerformed}`)
    console.log(`  Average match time: ${metrics.averageMatchTime.toFixed(2)}μs`)
    console.log(`  Memory usage: ${metrics.memoryUsage.current} bytes`)

    console.log('\n✅ Demo completed successfully!')

  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

runDemo().catch(console.error)
