import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View, StyleProp, TextStyle
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { runTool, TOOL_NAMES, ToolName } from "./src/lib/tools";

type Tab = "editor" | "tools" | "ai" | "settings";
type Language = "JavaScript" | "TypeScript" | "Python" | "Java" | "Go" | "Rust" | "C" | "C++" | "HTML" | "CSS" | "SQL" | "JSON";

const KEY_STORAGE = "devforge.ai.apiKey";
const MODEL_STORAGE = "devforge.ai.model";
const ENDPOINT_STORAGE = "devforge.ai.endpoint";
const snippets: Record<Language, { file: string; code: string }> = {
  JavaScript: { file: "index.js", code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("DevForge"));' },
  TypeScript: { file: "index.ts", code: 'type User = { name: string };\n\nconst greet = (user: User): string => `Hello, ${user.name}!`;\nconsole.log(greet({ name: "DevForge" }));' },
  Python: { file: "main.py", code: 'def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nprint(greet("DevForge"))' },
  Java: { file: "Main.java", code: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, DevForge!");\n  }\n}' },
  Go: { file: "main.go", code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, DevForge!")\n}' },
  Rust: { file: "main.rs", code: 'fn main() {\n    println!("Hello, DevForge!");\n}' },
  C: { file: "main.c", code: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello, DevForge!\\n");\n  return 0;\n}' },
  "C++": { file: "main.cpp", code: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, DevForge!\\n";\n  return 0;\n}' },
  HTML: { file: "index.html", code: '<!doctype html>\n<html lang="en">\n  <head><meta charset="utf-8"><title>DevForge</title></head>\n  <body><h1>Hello, DevForge!</h1></body>\n</html>' },
  CSS: { file: "styles.css", code: 'body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #0b0d12;\n  color: #f3f5fb;\n}' },
  SQL: { file: "query.sql", code: 'SELECT id, name, created_at\nFROM users\nWHERE active = TRUE\nORDER BY created_at DESC\nLIMIT 20;' },
  JSON: { file: "data.json", code: '{\n  "name": "DevForge",\n  "platform": "Android",\n  "tools": ["editor", "formatter", "AI"]\n}' }
};

const C = {
  bg: "#0B0D12", panel: "#121620", panel2: "#181E2A", border: "#282F3E",
  text: "#F2F4FA", muted: "#8F9AAF", accent: "#7C83FF", green: "#72D9AD",
  red: "#FF8D9B", input: "#0E121A"
};

function Button({ title, onPress, active = false, disabled = false, small = false }: {
  title: string; onPress: () => void; active?: boolean; disabled?: boolean; small?: boolean;
}) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, active && styles.buttonActive, small && styles.buttonSmall, disabled && { opacity: 0.45 }]}>
    <Text style={[styles.buttonText, active && { color: C.text }]}>{title}</Text>
  </Pressable>;
}

function Field({ value, onChangeText, placeholder, multiline = false, secret = false, style }: {
  value: string; onChangeText: (v: string) => void; placeholder: string;
  multiline?: boolean; secret?: boolean; style?: StyleProp<TextStyle>;
}) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
    placeholderTextColor={C.muted} multiline={multiline} secureTextEntry={secret}
    autoCapitalize="none" autoCorrect={false} selectionColor={C.accent}
    textAlignVertical={multiline ? "top" : "center"}
    style={[styles.field, multiline && styles.multiline, style]} />;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("editor");
  const [language, setLanguage] = useState<Language>("JavaScript");
  const [fileName, setFileName] = useState(snippets.JavaScript.file);
  const [code, setCode] = useState(snippets.JavaScript.code);
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<ToolName>("JSON Format");
  const [toolInput, setToolInput] = useState('{"name":"DevForge","ready":true}');
  const [toolCompare, setToolCompare] = useState("");
  const [toolOutput, setToolOutput] = useState("");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [includeCode, setIncludeCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready · mobile workspace");

  useEffect(() => {
    (async () => {
      try {
        const [savedKey, savedModel, savedEndpoint] = await Promise.all([
          SecureStore.getItemAsync(KEY_STORAGE),
          SecureStore.getItemAsync(MODEL_STORAGE),
          SecureStore.getItemAsync(ENDPOINT_STORAGE)
        ]);
        if (savedKey) setHasKey(true);
        if (savedModel) setModel(savedModel);
        if (savedEndpoint) setEndpoint(savedEndpoint);
      } catch {
        setStatus("Secure storage is unavailable on this device.");
      }
    })();
  }, []);

  const codeLines = useMemo(() => code.split("\n").length, [code]);

  function selectLanguage(next: Language) {
    if (dirty) {
      Alert.alert("Replace current code?", "Switching the starter template replaces the current editor contents.", [
        { text: "Cancel", style: "cancel" },
        { text: "Replace", style: "destructive", onPress: () => {
          setLanguage(next); setFileName(snippets[next].file); setCode(snippets[next].code); setDirty(false);
          setStatus("Loaded " + snippets[next].file);
        }}
      ]);
      return;
    }
    setLanguage(next); setFileName(snippets[next].file); setCode(snippets[next].code);
    setStatus("Loaded " + snippets[next].file);
  }

  function formatEditor() {
    try {
      if (language === "JSON") setCode(JSON.stringify(JSON.parse(code), null, 2));
      else if (language === "HTML") setCode(code.replace(/>\s*</g, ">\n<").trim());
      else {
        Alert.alert("Formatter", "The mobile MVP currently formats JSON in the editor. Use Toolbox for other text transformations.");
        return;
      }
      setDirty(true); setStatus("Formatted locally · review before saving");
    } catch (error) {
      Alert.alert("Format failed", error instanceof Error ? error.message : "Invalid input");
    }
  }

  function executeTool() {
    try {
      setToolOutput(runTool(tool, toolInput, toolCompare));
      setStatus(tool + " completed locally");
    } catch (error) {
      setToolOutput("Error: " + (error instanceof Error ? error.message : String(error)));
      setStatus("Tool failed");
    }
  }

  async function saveApiKey() {
    try {
      if (!apiKey.trim()) throw new Error("Paste an API key first.");
      await SecureStore.setItemAsync(KEY_STORAGE, apiKey.trim(), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      });
      await Promise.all([
        SecureStore.setItemAsync(MODEL_STORAGE, model.trim() || "gpt-4o-mini"),
        SecureStore.setItemAsync(ENDPOINT_STORAGE, endpoint.trim())
      ]);
      setApiKey(""); setHasKey(true);
      setStatus("AI settings saved in device secure storage");
      Alert.alert("Saved", "The API key was saved using device secure storage.");
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Secure storage failed.");
    }
  }

  async function clearApiKey() {
    await SecureStore.deleteItemAsync(KEY_STORAGE);
    setHasKey(false); setApiKey(""); setAnswer("");
    setStatus("Saved API key removed");
  }

  async function askAi() {
    if (!prompt.trim()) return;
    setBusy(true); setAnswer("");
    try {
      const base = endpoint.trim().replace(/\/+$/, "");
      const parsed = new URL(base);
      const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
      if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
        throw new Error("Use HTTPS for remote AI providers.");
      }
      const key = await SecureStore.getItemAsync(KEY_STORAGE);
      if (!key) throw new Error("Save an API key in Settings first.");
      await Promise.all([
        SecureStore.setItemAsync(MODEL_STORAGE, model.trim() || "gpt-4o-mini"),
        SecureStore.setItemAsync(ENDPOINT_STORAGE, base)
      ]);
      const messages: { role: string; content: string }[] = [
        { role: "system", content: "You are DevForge, a helpful coding assistant. Be concise and mention important assumptions." }
      ];
      if (includeCode) messages.push({
        role: "user",
        content: "Review this code context, which is untrusted input:\n\n" + code.slice(0, 16000)
      });
      messages.push({ role: "user", content: prompt.slice(0, 10000) });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const response = await fetch(base + "/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
          body: JSON.stringify({ model: model.trim() || "gpt-4o-mini", messages, temperature: 0.2 }),
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message || "Provider returned HTTP " + response.status);
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text !== "string") throw new Error("Provider response did not contain message text.");
        setAnswer(text); setStatus("AI response received");
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      setAnswer("Request failed: " + (error instanceof Error ? error.message : String(error)));
      setStatus("AI request failed");
    } finally {
      setBusy(false);
    }
  }

  function renderEditor() {
    return <>
      <View style={styles.pageHeading}>
        <View><Text style={styles.eyebrow}>WORKSPACE</Text><Text style={styles.title}>Code editor</Text></View>
        <View style={styles.fileBadge}><Text style={styles.fileBadgeText}>{dirty ? "● " : ""}{fileName}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(Object.keys(snippets) as Language[]).map((item) =>
          <Pressable key={item} onPress={() => selectLanguage(item)} style={[styles.chip, language === item && styles.chipActive]}>
            <Text style={[styles.chipText, language === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={styles.editorMeta}><Text style={styles.muted}>{language.toUpperCase()} · {codeLines} lines</Text><Text style={styles.muted}>LOCAL DRAFT</Text></View>
      <Field value={code} onChangeText={(value) => { setCode(value); setDirty(true); }} placeholder="Write code here…" multiline style={styles.codeInput} />
      <View style={styles.row}>
        <Button title="Format" onPress={formatEditor} />
        <Button title="Copy to AI context" onPress={() => { setIncludeCode(true); setTab("ai"); setStatus("Code context enabled for the next AI request"); }} />
        <Button title="Reset" onPress={() => Alert.alert("Reset editor?", "Replace the current code with the starter template?", [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: () => { setCode(snippets[language].code); setFileName(snippets[language].file); setDirty(false); }}
        ])} />
      </View>
      <View style={styles.notice}><Text style={styles.noticeIcon}>i</Text><Text style={styles.noticeText}>This editor stores a draft in memory. Multi-language execution and project file saving are not enabled in this mobile MVP.</Text></View>
      <View style={styles.statsRow}><Stat label="Language" value={language} /><Stat label="Characters" value={String(code.length)} /><Stat label="Lines" value={String(codeLines)} /></View>
    </>;
  }

  function renderTools() {
    return <>
      <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>LOCAL UTILITIES</Text><Text style={styles.title}>Developer toolbox</Text></View></View>
      <View style={styles.toolGrid}>{TOOL_NAMES.map((item) =>
        <Pressable key={item} onPress={() => { setTool(item); setToolOutput(""); }} style={[styles.toolCard, tool === item && styles.toolCardActive]}>
          <Text style={styles.toolCardTitle}>{item}</Text><Text style={styles.toolCardHint}>{tool === item ? "SELECTED" : "Run locally"}</Text>
        </Pressable>
      )}</View>
      <Text style={styles.label}>INPUT · {tool}</Text>
      <Field value={toolInput} onChangeText={setToolInput} placeholder="Paste input…" multiline style={styles.toolInput} />
      {tool === "Line Compare" && <><Text style={styles.label}>COMPARE AGAINST</Text><Field value={toolCompare} onChangeText={setToolCompare} placeholder="Paste second text…" multiline style={styles.toolInput} /></>}
      <Button title="Run tool" active onPress={executeTool} />
      <Text style={styles.label}>OUTPUT</Text>
      <View style={styles.outputBox}><Text selectable style={styles.outputText}>{toolOutput || "Your result will appear here."}</Text></View>
      <Button title="Use output in editor" onPress={() => { if (toolOutput && !toolOutput.startsWith("Error:")) { setCode(toolOutput); setDirty(true); setTab("editor"); } }} />
      <Text style={styles.footnote}>All toolbox operations run on-device. JWT payload decoding does not validate signatures.</Text>
    </>;
  }

  function renderAi() {
    return <>
      <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>PAIR PROGRAMMER</Text><Text style={styles.title}>AI assistant</Text></View><View style={[styles.statusDot, { backgroundColor: hasKey ? C.green : C.muted }]} /></View>
      <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><Text style={styles.noticeText}>Prompts and optionally selected code are sent to your configured AI provider. AI output is untrusted; review it before using.</Text></View>
      <Text style={styles.label}>PROMPT</Text>
      <Field value={prompt} onChangeText={setPrompt} placeholder="Explain this error, review my code, suggest a refactor…" multiline style={styles.promptInput} />
      <Pressable onPress={() => setIncludeCode(!includeCode)} style={styles.checkRow}>
        <View style={[styles.checkbox, includeCode && styles.checkboxActive]}>{includeCode && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}</View>
        <View style={{ flex: 1 }}><Text style={styles.checkTitle}>Include current editor code</Text><Text style={styles.muted}>Only included when you send a prompt</Text></View>
      </Pressable>
      <Button title={busy ? "Thinking…" : "Send prompt"} active disabled={busy || !prompt.trim() || !hasKey} onPress={() => void askAi()} />
      {!hasKey && <Text style={styles.footnote}>Add your provider API key in Settings to enable AI chat.</Text>}
      {answer.length > 0 && <><Text style={styles.label}>RESPONSE</Text><View style={styles.outputBox}><Text selectable style={styles.outputText}>{answer}</Text></View></>}
      <Text style={styles.label}>QUICK PROMPTS</Text>
      <View style={styles.rowWrap}>{["Explain this code", "Find bugs", "Improve readability", "Write unit tests"].map((q) =>
        <Button key={q} title={q} small onPress={() => setPrompt(q + (includeCode ? " in the included code" : ""))} />
      )}</View>
    </>;
  }

  function renderSettings() {
    return <>
      <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>PREFERENCES</Text><Text style={styles.title}>Settings</Text></View></View>
      <View style={styles.settingsCard}>
        <Text style={styles.cardTitle}>AI provider</Text><Text style={styles.cardDescription}>OpenAI-compatible chat completions API.</Text>
        <Text style={styles.label}>API BASE URL</Text><Field value={endpoint} onChangeText={setEndpoint} placeholder="https://api.openai.com/v1" />
        <Text style={styles.label}>MODEL</Text><Field value={model} onChangeText={setModel} placeholder="gpt-4o-mini" />
        <Text style={styles.label}>API KEY {hasKey ? "· SAVED" : "· NOT CONFIGURED"}</Text>
        <Field value={apiKey} onChangeText={setApiKey} placeholder={hasKey ? "Enter a new key to replace saved key" : "Paste API key"} secret />
        <Button title="Save AI settings securely" active onPress={() => void saveApiKey()} />
        {hasKey && <Button title="Remove saved API key" onPress={() => Alert.alert("Remove API key?", "AI chat will be disabled until you save a key again.", [
          { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void clearApiKey() }
        ])} />}
      </View>
      <View style={styles.settingsCard}>
        <Text style={styles.cardTitle}>About DevForge</Text>
        <Text style={styles.cardDescription}>Android companion · version 0.1.0{"\n"}Built with React Native + Expo. Designed for phone screens.</Text>
        <View style={styles.separator} />
        <Text style={styles.cardDescription}>The mobile version currently includes a code draft editor, on-device developer tools, and configurable AI chat. It does not bundle compilers, a terminal, Git client, or debugger.</Text>
      </View>
    </>;
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={C.bg} />
    <View style={styles.header}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>D</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.brand}>DevForge <Text style={styles.brandMobile}>MOBILE</Text></Text><Text style={styles.brandSub}>Developer workspace</Text></View>
      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>READY</Text></View>
    </View>
    <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {tab === "editor" ? renderEditor() : tab === "tools" ? renderTools() : tab === "ai" ? renderAi() : renderSettings()}
      </ScrollView>
    </KeyboardAvoidingView>
    <View style={styles.statusBar}><View style={styles.statusDot} /><Text numberOfLines={1} style={styles.statusText}>{status}</Text><Text style={styles.statusRight}>ANDROID</Text></View>
    <View style={styles.tabBar}>
      {([
        ["editor", "⌘", "Editor"], ["tools", "⚒", "Tools"], ["ai", "✳", "AI"], ["settings", "⚙", "Settings"]
      ] as [Tab, string, string][]).map(([key, icon, label]) =>
        <Pressable key={key} onPress={() => setTab(key)} style={[styles.tabItem, tab === key && styles.tabItemActive]}>
          <Text style={[styles.tabIcon, tab === key && styles.tabIconActive]}>{icon}</Text>
          <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
        </Pressable>
      )}
    </View>
  </SafeAreaView>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text numberOfLines={1} style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: C.border, gap: 11 },
  brandMark: { width: 37, height: 37, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  brandMarkText: { fontSize: 21, fontWeight: "900", color: "#fff" },
  brand: { fontSize: 16, fontWeight: "800", color: C.text, letterSpacing: 0.2 },
  brandMobile: { fontSize: 9, color: C.accent, letterSpacing: 1.2 },
  brandSub: { color: C.muted, fontSize: 10, marginTop: 2 },
  liveBadge: { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "#17251F", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
  liveText: { color: C.green, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  pageHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  eyebrow: { color: C.accent, fontSize: 9, letterSpacing: 2, fontWeight: "800", marginBottom: 5 },
  title: { color: C.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  fileBadge: { backgroundColor: C.panel2, borderColor: C.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, maxWidth: 145 },
  fileBadgeText: { color: C.muted, fontSize: 10, fontFamily: Platform.OS === "android" ? "monospace" : undefined },
  chipRow: { gap: 7, paddingBottom: 13 },
  chip: { paddingVertical: 7, paddingHorizontal: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, borderRadius: 8 },
  chipActive: { borderColor: C.accent, backgroundColor: "#202341" },
  chipText: { color: C.muted, fontSize: 11, fontWeight: "600" },
  chipTextActive: { color: "#DADCFD" },
  editorMeta: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 7 },
  muted: { color: C.muted, fontSize: 10 },
  field: { minHeight: 43, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.input, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12 },
  multiline: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" },
  codeInput: { minHeight: 300, borderRadius: 10, padding: 13, fontFamily: Platform.OS === "android" ? "monospace" : undefined, fontSize: 12, lineHeight: 20, color: "#D7DDF2", backgroundColor: "#0E1118", borderColor: "#252C3A" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11, marginBottom: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: { alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel2, paddingVertical: 10, paddingHorizontal: 13, marginTop: 8 },
  buttonActive: { borderColor: C.accent, backgroundColor: "#34376A" },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 9 },
  buttonText: { color: C.text, fontSize: 11, fontWeight: "700" },
  notice: { flexDirection: "row", gap: 9, alignItems: "flex-start", padding: 11, backgroundColor: "#151A29", borderWidth: 1, borderColor: "#2C3451", borderRadius: 9, marginTop: 11 },
  noticeIcon: { color: C.accent, fontWeight: "900", fontSize: 12 },
  noticeText: { flex: 1, color: "#AEB7CD", fontSize: 10, lineHeight: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 13 },
  stat: { flex: 1, backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, padding: 10, borderRadius: 9 },
  statLabel: { color: C.muted, fontSize: 9, marginBottom: 6 },
  statValue: { color: C.text, fontWeight: "800", fontSize: 12 },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  toolCard: { width: "48%", minHeight: 65, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel, borderRadius: 9, padding: 10, justifyContent: "center" },
  toolCardActive: { borderColor: C.accent, backgroundColor: "#202341" },
  toolCardTitle: { color: C.text, fontSize: 11, fontWeight: "700" },
  toolCardHint: { color: C.muted, fontSize: 8, letterSpacing: 1, marginTop: 6 },
  label: { color: C.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: "800", marginTop: 15, marginBottom: 7 },
  toolInput: { minHeight: 100, fontFamily: Platform.OS === "android" ? "monospace" : undefined },
  outputBox: { backgroundColor: "#0E1118", borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 12, minHeight: 90, marginBottom: 7 },
  outputText: { color: "#D7DDF2", fontSize: 11, lineHeight: 18, fontFamily: Platform.OS === "android" ? "monospace" : undefined },
  footnote: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 12 },
  promptInput: { minHeight: 120, marginBottom: 9 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: C.muted, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: C.accent, borderColor: C.accent },
  checkTitle: { color: C.text, fontSize: 11, fontWeight: "700", marginBottom: 3 },
  statusBar: { height: 28, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: "#0D1016" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  statusText: { flex: 1, color: C.muted, fontSize: 9 },
  statusRight: { color: C.muted, fontSize: 8, letterSpacing: 1.3 },
  tabBar: { flexDirection: "row", backgroundColor: "#10141D", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 7, paddingBottom: Platform.OS === "android" ? 7 : 12 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 5, gap: 3 },
  tabItemActive: { borderRadius: 9, backgroundColor: "#202341" },
  tabIcon: { color: C.muted, fontSize: 17 },
  tabIconActive: { color: C.accent },
  tabLabel: { color: C.muted, fontSize: 9, fontWeight: "600" },
  tabLabelActive: { color: C.text },
  settingsCard: { backgroundColor: C.panel, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 13 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: "800" },
  cardDescription: { color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 7, marginBottom: 5 },
  separator: { height: 1, backgroundColor: C.border, marginVertical: 12 }
});
