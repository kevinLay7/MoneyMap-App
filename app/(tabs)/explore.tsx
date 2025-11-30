import { useState, useEffect } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  Switch,
  View,
  Button,
  ScrollView,
} from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import database from "@/model/database";
import Category from "@/model/models/category";
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync";
import { databaseSynchronize } from "@/model/synchronize";
import { useDependency } from "@/context/dependencyContext";

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("");
  const [detailed, setDetailed] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [ignored, setIgnored] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { syncApi } = useDependency();

  useEffect(() => {
    const subscription = database
      .get<Category>("categories")
      .query()
      .observe()
      .subscribe((categories) => {
        setCategories(categories);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (
      !name.trim() ||
      !primary.trim() ||
      !detailed.trim() ||
      !description.trim()
    ) {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields (name, primary, detailed, description)"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await database.write(async () => {
        await database.get<Category>("categories").create((category) => {
          category.name = name.trim();
          category.primary = primary.trim();
          category.detailed = detailed.trim();
          category.description = description.trim();
          category.icon = icon.trim() || undefined;
          category.color = color.trim() || undefined;
          category.ignored = ignored;
        });
      });

      Alert.alert("Success", "Category saved successfully!");

      // Reset form
      setName("");
      setPrimary("");
      setDetailed("");
      setDescription("");
      setIcon("");
      setColor("");
      setIgnored(false);

      // Categories will automatically update via the observable subscription
    } catch (error) {
      console.error("Error saving category:", error);
      Alert.alert(
        "Error",
        "Failed to save category. Check console for details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckUnsyncedChanges = async () => {
    setIsCheckingSync(true);
    try {
      const hasUnsyncedChangesResult = await hasUnsyncedChanges({ database });
      console.log("hasUnsyncedChangesResult", hasUnsyncedChangesResult);
    } catch (error) {
      console.error("Error checking unsynced changes:", error);
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await databaseSynchronize(syncApi);
      Alert.alert("Success", "Database synchronized successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error syncing database:", error);
      Alert.alert(
        "Error",
        "Failed to sync database. Check console for details.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Create Category
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.syncContainer}>
        <View style={styles.syncButtons}>
          <View style={styles.syncButtonWrapper}>
            <Button
              title={isCheckingSync ? "Checking..." : "Check Unsynced Changes"}
              onPress={handleCheckUnsyncedChanges}
              disabled={isCheckingSync || isSyncing}
              color={Colors.primary}
            />
          </View>
          <View style={styles.syncButtonWrapper}>
            <Button
              title={isSyncing ? "Syncing..." : "Sync Database"}
              onPress={handleSync}
              disabled={isSyncing || isCheckingSync}
              color={Colors.primary}
            />
          </View>
        </View>
      </ThemedView>

      {/* Categories Table */}
      <ThemedView style={styles.categoriesContainer}>
        <ThemedText
          type="subtitle"
          style={{
            fontFamily: Fonts.rounded,
            marginBottom: 12,
          }}
        >
          Categories ({categories.length})
        </ThemedText>
        {categories.length === 0 ? (
          <ThemedText style={styles.emptyText}>No categories yet</ThemedText>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tableScroll}
          >
            <View style={styles.table}>
              {/* Table Header */}
              <View
                style={[
                  styles.tableRow,
                  styles.tableHeader,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.icon,
                  },
                ]}
              >
                <ThemedText style={[styles.tableHeaderCell, styles.colName]}>
                  Name
                </ThemedText>
                <ThemedText style={[styles.tableHeaderCell, styles.colPrimary]}>
                  Primary
                </ThemedText>
                <ThemedText
                  style={[styles.tableHeaderCell, styles.colDetailed]}
                >
                  Detailed
                </ThemedText>
                <ThemedText style={[styles.tableHeaderCell, styles.colIgnored]}>
                  Ignored
                </ThemedText>
              </View>
              {/* Table Rows */}
              {categories.map((category) => (
                <View
                  key={category.id}
                  style={[
                    styles.tableRow,
                    { borderColor: colors.icon },
                    category.ignored && styles.ignoredRow,
                  ]}
                >
                  <ThemedText style={[styles.tableCell, styles.colName]}>
                    {category.name}
                  </ThemedText>
                  <ThemedText style={[styles.tableCell, styles.colPrimary]}>
                    {category.primary}
                  </ThemedText>
                  <ThemedText style={[styles.tableCell, styles.colDetailed]}>
                    {category.detailed}
                  </ThemedText>
                  <ThemedText style={[styles.tableCell, styles.colIgnored]}>
                    {category.ignored ? "Yes" : "No"}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ThemedView>

      <ThemedView style={styles.formContainer}>
        <ThemedText style={styles.label}>Name *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Category name"
          placeholderTextColor={colors.icon}
        />

        <ThemedText style={styles.label}>Primary *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={primary}
          onChangeText={setPrimary}
          placeholder="Primary category"
          placeholderTextColor={colors.icon}
        />

        <ThemedText style={styles.label}>Detailed *</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={detailed}
          onChangeText={setDetailed}
          placeholder="Detailed category"
          placeholderTextColor={colors.icon}
        />

        <ThemedText style={styles.label}>Description *</ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Category description"
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={3}
        />

        <ThemedText style={styles.label}>Icon (optional)</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={icon}
          onChangeText={setIcon}
          placeholder="Icon name or URL"
          placeholderTextColor={colors.icon}
        />

        <ThemedText style={styles.label}>Color (optional)</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          value={color}
          onChangeText={setColor}
          placeholder="Hex color code (e.g., #FF5733)"
          placeholderTextColor={colors.icon}
        />

        <View style={styles.switchContainer}>
          <ThemedText style={styles.label}>Ignored</ThemedText>
          <Switch
            value={ignored}
            onValueChange={setIgnored}
            trackColor={{ false: colors.icon, true: Colors.primary }}
            thumbColor={ignored ? "#fff" : "#f4f3f4"}
          />
        </View>

        <Button
          title={isSubmitting ? "Saving..." : "Save Category"}
          onPress={handleSubmit}
          disabled={isSubmitting}
          color={Colors.primary}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  syncContainer: {
    marginBottom: 24,
  },
  syncButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  syncButtonWrapper: {
    flex: 1,
  },
  categoriesContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.6,
  },
  tableScroll: {
    marginHorizontal: -16,
  },
  table: {
    paddingHorizontal: 16,
  },
  tableHeader: {
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ignoredRow: {
    opacity: 0.5,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 14,
    paddingHorizontal: 8,
  },
  colName: {
    width: 120,
  },
  colPrimary: {
    width: 100,
  },
  colDetailed: {
    width: 120,
  },
  colIgnored: {
    width: 60,
  },
  formContainer: {
    gap: 12,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
});
