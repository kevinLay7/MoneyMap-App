import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useAuth0 } from "react-native-auth0";
import { useGetCategories } from "@/hooks/api/categories-api";
import { Button } from "@/components/button";
import Header from "@/components/header";
import { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import { BackgroundContainer } from "@/components/background-container";
import AnimatedScrollView from "@/components/animated-scrollview";
import { Colors } from "@/constants/colors";

export default function HomeScreen() {
  const { refetch: fetchCategories, isFetching } = useGetCategories();

  const { clearCredentials } = useAuth0();

  const animatedRef = useAnimatedRef<any>();
  const scrollOffset = useScrollOffset(animatedRef);

  return (
    <BackgroundContainer>
      <Header
        scrollOffset={scrollOffset}
        backgroundHex={Colors.primary}
        centerComponent={<ThemedText type="subtitle">MoneyMap</ThemedText>}
      />

      <AnimatedScrollView
        animatedRef={animatedRef}
        isPending={isFetching}
        isRefreshing={isFetching}
      >
        <View className="h-full p-4 pt-28 ">
          <Button
            color="warning"
            title="Logout"
            onPress={() => clearCredentials()}
          />
          <Button
            title={isFetching ? "Loading..." : "Test API Call"}
            onPress={() => {
              fetchCategories()
                .then((result) => {
                  console.log("Categories fetched:", result.data);
                  alert(`Fetched ${result.data?.length || 0} categories`);
                })
                .catch((error) => {
                  console.error("API call failed:", error);
                  alert("API call failed - check console");
                });
            }}
          />
        </View>
      </AnimatedScrollView>
    </BackgroundContainer>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
