import { Stack } from "expo-router/stack";

const titles: Record<string, string> = {
  home: "Home",
  search: "Search",
  library: "Library",
  settings: "Settings",
};

export default function SharedLayout({
  segment,
}: {
  segment: string;
}) {
  const screen = segment.match(/\((.*)\)/)?.[1] ?? "home";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#000" },
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name={screen}
        options={{
          title: titles[screen] ?? screen,
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="album/[id]"
        options={{
          headerLargeTitle: false,
          title: "",
        }}
      />
      <Stack.Screen
        name="artist/[id]"
        options={{
          headerLargeTitle: false,
          title: "",
        }}
      />
    </Stack>
  );
}
