import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('ErrorBoundary yakaladı:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
          <Text style={styles.title}>Bir hata oluştu</Text>
          <Text style={styles.subtitle}>
            Aşağıdaki mesajın bir fotoğrafını/ekran görüntüsünü Claude'a gönderirseniz, sorunu kesin olarak
            bulup düzeltebiliriz.
          </Text>
          <View style={styles.box}>
            <Text style={styles.errorText}>{String(this.state.error?.message || this.state.error)}</Text>
            {!!this.state.error?.stack && <Text style={styles.stackText}>{this.state.error.stack}</Text>}
            {!!this.state.errorInfo?.componentStack && (
              <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Yeniden Dene</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: '#C1272D', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 16 },
  box: { backgroundColor: '#f7f7f9', borderRadius: 10, padding: 14, marginBottom: 20 },
  errorText: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 10 },
  stackText: { fontSize: 11, color: '#666', marginTop: 8, fontFamily: 'monospace' },
  button: { backgroundColor: '#1B2A6B', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
