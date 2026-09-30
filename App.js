import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format numbers with commas, handling floating decimals gracefully
const formatNumberWithCommas = (numStr) => {
  if (!numStr) return '';
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Safe math calculation engine (no eval)
const safeCalculate = (expression) => {
  if (!expression || typeof expression !== 'string') return '';

  // Clean expression and replace visual symbols with standard arithmetic operators
  let sanitized = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .trim();

  // Strip trailing operators for live preview
  while (/[+\-*/.]$/.test(sanitized)) {
    sanitized = sanitized.slice(0, -1).trim();
  }

  if (!sanitized) return '';

  try {
    // Tokenize numbers, operators, and percentages
    const tokens = [];
    let currentNumber = '';

    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];

      // Handle negative numbers at the beginning or after an operator
      if (
        char === '-' &&
        (i === 0 || ['+', '-', '*', '/'].includes(sanitized[i - 1]))
      ) {
        currentNumber += char;
        continue;
      }

      if ((char >= '0' && char <= '9') || char === '.') {
        currentNumber += char;
      } else if (char === '%') {
        if (currentNumber !== '') {
          const val = parseFloat(currentNumber) / 100;
          currentNumber = val.toString();
        }
      } else if (['+', '-', '*', '/'].includes(char)) {
        if (currentNumber !== '') {
          tokens.push(parseFloat(currentNumber));
          currentNumber = '';
        }
        tokens.push(char);
      }
    }

    if (currentNumber !== '') {
      tokens.push(parseFloat(currentNumber));
    }

    if (tokens.length === 0) return '';

    // First pass: Multiplication and Division (*, /)
    const pass1Tokens = [];
    let idx = 0;
    while (idx < tokens.length) {
      const token = tokens[idx];
      if (token === '*' || token === '/') {
        const prev = pass1Tokens.pop();
        const next = tokens[idx + 1];

        if (next === undefined || isNaN(next)) return '';

        if (token === '/' && next === 0) {
          return 'Cannot divide by 0';
        }

        const result = token === '*' ? prev * next : prev / next;
        pass1Tokens.push(result);
        idx += 2;
      } else {
        pass1Tokens.push(token);
        idx++;
      }
    }

    // Second pass: Addition and Subtraction (+, -)
    if (pass1Tokens.length === 0) return '';
    let finalResult = pass1Tokens[0];
    if (typeof finalResult !== 'number') return '';

    for (let i = 1; i < pass1Tokens.length; i += 2) {
      const operator = pass1Tokens[i];
      const nextNum = pass1Tokens[i + 1];

      if (typeof nextNum !== 'number') return '';

      if (operator === '+') {
        finalResult += nextNum;
      } else if (operator === '-') {
        finalResult -= nextNum;
      }
    }

    // Rounding to fix floating point precision errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
    const precisionFixed = parseFloat(finalResult.toPrecision(12));

    // Check if result is too large
    if (Math.abs(precisionFixed) > 1e12 || (Math.abs(precisionFixed) < 1e-6 && precisionFixed !== 0)) {
      return precisionFixed.toExponential(4);
    }

    return precisionFixed.toString();
  } catch {
    return '';
  }
};

export default function App() {
  const [expression, setExpression] = useState('');
  const [previewResult, setPreviewResult] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);

  // Update live preview when expression changes
  useEffect(() => {
    if (!expression) {
      setPreviewResult('');
      return;
    }

    // Only compute preview if expression contains at least one operator
    const hasOperator = /[+−×÷%]/.test(expression);
    if (hasOperator) {
      const result = safeCalculate(expression);
      setPreviewResult(result);
    } else {
      setPreviewResult('');
    }
  }, [expression]);

  // Handle number input
  const handleNumber = (digit) => {
    if (isCalculated) {
      setExpression(digit);
      setIsCalculated(false);
      return;
    }

    // Get current operand to prevent leading multiple zeroes
    const segments = expression.split(/[+−×÷]/);
    const currentSegment = segments[segments.length - 1];

    if (currentSegment === '0' && digit === '0') {
      return;
    }
    if (currentSegment === '0' && digit !== '0') {
      // Replace leading 0
      setExpression((prev) => prev.slice(0, -1) + digit);
      return;
    }

    setExpression((prev) => prev + digit);
  };

  // Handle decimal dot
  const handleDecimal = () => {
    if (isCalculated) {
      setExpression('0.');
      setIsCalculated(false);
      return;
    }

    const segments = expression.split(/[+−×÷]/);
    const currentSegment = segments[segments.length - 1];

    if (currentSegment.includes('.')) {
      return; // Prevent duplicate decimal in the same number
    }

    if (!currentSegment || currentSegment === '') {
      setExpression((prev) => prev + '0.');
    } else {
      setExpression((prev) => prev + '.');
    }
  };

  // Handle arithmetic operator (+, −, ×, ÷)
  const handleOperator = (op) => {
    setIsCalculated(false);

    if (!expression) {
      if (op === '−') {
        setExpression('−');
      }
      return;
    }

    const lastChar = expression.slice(-1);

    // If last character is already an operator, replace it
    if (['+', '−', '×', '÷'].includes(lastChar)) {
      setExpression((prev) => prev.slice(0, -1) + op);
    } else {
      setExpression((prev) => prev + op);
    }
  };

  // Handle percentage (%)
  const handlePercentage = () => {
    if (!expression || isCalculated) return;
    const lastChar = expression.slice(-1);
    if (['+', '−', '×', '÷', '%', '.'].includes(lastChar)) return;

    setExpression((prev) => prev + '%');
  };

  // Handle sign toggle (±)
  const handleToggleSign = () => {
    if (!expression) return;

    if (isCalculated) {
      const val = parseFloat(expression);
      if (!isNaN(val)) {
        setExpression((-val).toString());
        setIsCalculated(false);
      }
      return;
    }

    const segments = expression.split(/([+−×÷])/);
    let lastNumber = segments[segments.length - 1];

    if (!lastNumber) return;

    if (lastNumber.startsWith('-') || lastNumber.startsWith('−')) {
      segments[segments.length - 1] = lastNumber.slice(1);
    } else {
      segments[segments.length - 1] = '−' + lastNumber;
    }

    setExpression(segments.join(''));
  };

  // Handle Backspace (⌫)
  const handleBackspace = () => {
    if (isCalculated) {
      setExpression('');
      setPreviewResult('');
      setIsCalculated(false);
      return;
    }
    setExpression((prev) => prev.slice(0, -1));
  };

  // Handle Clear (AC)
  const handleClear = () => {
    setExpression('');
    setPreviewResult('');
    setIsCalculated(false);
  };

  // Handle Equals (=)
  const handleEquals = () => {
    if (!expression) return;

    const result = safeCalculate(expression);
    if (result !== '') {
      if (result === 'Cannot divide by 0') {
        setPreviewResult('Cannot divide by 0');
        setIsCalculated(true);
      } else {
        setExpression(result);
        setPreviewResult('');
        setIsCalculated(true);
      }
    }
  };

  // Button layout configuration
  const buttonRows = [
    [
      { label: 'AC', type: 'function', onPress: handleClear },
      { label: '±', type: 'function', onPress: handleToggleSign },
      { label: '%', type: 'function', onPress: handlePercentage },
      { label: '÷', type: 'operator', onPress: () => handleOperator('÷') },
    ],
    [
      { label: '7', type: 'number', onPress: () => handleNumber('7') },
      { label: '8', type: 'number', onPress: () => handleNumber('8') },
      { label: '9', type: 'number', onPress: () => handleNumber('9') },
      { label: '×', type: 'operator', onPress: () => handleOperator('×') },
    ],
    [
      { label: '4', type: 'number', onPress: () => handleNumber('4') },
      { label: '5', type: 'number', onPress: () => handleNumber('5') },
      { label: '6', type: 'number', onPress: () => handleNumber('6') },
      { label: '−', type: 'operator', onPress: () => handleOperator('−') },
    ],
    [
      { label: '1', type: 'number', onPress: () => handleNumber('1') },
      { label: '2', type: 'number', onPress: () => handleNumber('2') },
      { label: '3', type: 'number', onPress: () => handleNumber('3') },
      { label: '+', type: 'operator', onPress: () => handleOperator('+') },
    ],
    [
      { label: '0', type: 'number', onPress: () => handleNumber('0') },
      { label: '.', type: 'number', onPress: handleDecimal },
      { label: '⌫', type: 'function', onPress: handleBackspace },
      { label: '=', type: 'action', onPress: handleEquals },
    ],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#121212" />
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CALCULATOR</Text>
      </View>

      {/* Two-line Display Area */}
      <View style={styles.displayContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.expressionScroll}
        >
          <Text
            style={[
              styles.expressionText,
              expression.length > 12 && styles.expressionTextSmall,
            ]}
          >
            {expression || '0'}
          </Text>
        </ScrollView>

        <View style={styles.previewContainer}>
          <Text
            style={[
              styles.previewText,
              previewResult === 'Cannot divide by 0' && styles.errorText,
            ]}
          >
            {previewResult ? `= ${previewResult}` : ' '}
          </Text>
        </View>
      </View>

      {/* Button Grid Area */}
      <View style={styles.keypadContainer}>
        {buttonRows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((btn, btnIndex) => {
              let buttonStyle = styles.btnNumber;
              let textStyle = styles.btnTextNumber;

              if (btn.type === 'operator') {
                buttonStyle = styles.btnOperator;
                textStyle = styles.btnTextOperator;
              } else if (btn.type === 'function') {
                buttonStyle = styles.btnFunction;
                textStyle = styles.btnTextFunction;
              } else if (btn.type === 'action') {
                buttonStyle = styles.btnAction;
                textStyle = styles.btnTextAction;
              }

              return (
                <TouchableOpacity
                  key={`btn-${btnIndex}`}
                  style={[styles.button, buttonStyle]}
                  activeOpacity={0.65}
                  onPress={btn.onPress}
                >
                  <Text style={[styles.buttonText, textStyle]}>{btn.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  expressionScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  expressionText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'right',
  },
  expressionTextSmall: {
    fontSize: 36,
  },
  previewContainer: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  previewText: {
    color: '#9CA3AF',
    fontSize: 26,
    fontWeight: '400',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '500',
  },
  keypadContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    height: (SCREEN_WIDTH - 32 - 36) / 4,
    borderRadius: (SCREEN_WIDTH - 32 - 36) / 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow fallback
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  btnNumber: {
    backgroundColor: '#1E232A',
  },
  btnOperator: {
    backgroundColor: '#2A303C',
  },
  btnFunction: {
    backgroundColor: '#374151',
  },
  btnAction: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    fontSize: 26,
    fontWeight: '500',
  },
  btnTextNumber: {
    color: '#F3F4F6',
  },
  btnTextOperator: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  btnTextFunction: {
    color: '#E5E7EB',
  },
  btnTextAction: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
