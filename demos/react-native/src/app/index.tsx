import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ABSTRAXION</Text>
      <Text style={styles.subtitle}>React Native demo scaffold</Text>
      <Text style={styles.body}>
        Add screens under {`src/app/`} — Expo Router picks them up via
        file-based routing.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: 24,
    gap: 12,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
  },
  body: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 280,
  },
});
