import { useEffect } from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { usePlayerStore } from "@/stores/player-store";
import { PlayerContainer } from "@/components/player-container";

const TAB_BAR_HEIGHT = 49;

function TabIcon({ sfSymbol, focused }: { sfSymbol: string; focused: boolean }) {
  return (
    <Image
      source={`sf:${sfSymbol}`}
      style={{ width: 22, height: 22 }}
      tintColor={focused ? "#fff" : "#666"}
    />
  );
}

export default function RootLayout() {
  const setupPlayer = usePlayerStore((s) => s.setupPlayer);

  useEffect(() => {
    setupPlayer();
  }, [setupPlayer]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#fff",
            tabBarInactiveTintColor: "#666",
            tabBarStyle: {
              backgroundColor: "#000",
              borderTopColor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          <Tabs.Screen
            name="(home)"
            options={{
              title: "Home",
              tabBarIcon: ({ focused }) => (
                <TabIcon sfSymbol="house.fill" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="(search)"
            options={{
              title: "Search",
              tabBarIcon: ({ focused }) => (
                <TabIcon sfSymbol="magnifyingglass" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="(library)"
            options={{
              title: "Library",
              tabBarIcon: ({ focused }) => (
                <TabIcon sfSymbol="books.vertical.fill" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="(settings)"
            options={{
              title: "Settings",
              tabBarIcon: ({ focused }) => (
                <TabIcon sfSymbol="gearshape.fill" focused={focused} />
              ),
            }}
          />
        </Tabs>

        <PlayerContainer tabBarHeight={TAB_BAR_HEIGHT} />
      </View>
    </GestureHandlerRootView>
  );
}
