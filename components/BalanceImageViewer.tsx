import React, { useState } from "react";
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
} from "react-native";
import { X, Image as ImageIcon } from "lucide-react-native";
import type { Balance } from "../types";
import { getBalanceImageInfo } from "../utils/imageUtils";

interface BalanceImageViewerProps {
  balance: Balance;
  thumbnailSize?: number;
  showLabel?: boolean;
}

/**
 * Component to display a balance image with modal preview
 */
export function BalanceImageViewer({
  balance,
  thumbnailSize = 60,
  showLabel = true,
}: BalanceImageViewerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const imageInfo = getBalanceImageInfo(balance);

  if (!imageInfo.hasImage) {
    return (
      <View
        style={[
          styles.noImageContainer,
          { width: thumbnailSize, height: thumbnailSize },
        ]}
      >
        <ImageIcon size={thumbnailSize * 0.4} color="#9CA3AF" />
        {showLabel && <Text style={styles.noImageText}>No image</Text>}
      </View>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.thumbnailContainer}
      >
        <Image
          source={{ uri: imageInfo.source! }}
          style={[
            styles.thumbnail,
            { width: thumbnailSize, height: thumbnailSize },
          ]}
          resizeMode="cover"
        />
        {showLabel && (
          <Text style={styles.label}>
            {imageInfo.sourceType === "mobile" ? "📱 App" : "💬 WhatsApp"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Full-screen Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{balance.account}</Text>
              <Text style={styles.modalSubtitle}>
                {balance.shift} Shift • {balance.date}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageInfo.source! }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Amount: {balance.amount.toLocaleString()}
            </Text>
            <Text style={styles.footerText}>
              Source:{" "}
              {imageInfo.sourceType === "mobile" ? "Mobile App" : "WhatsApp"}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  noImageContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noImageText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  thumbnailContainer: {
    position: "relative",
  },
  thumbnail: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#C62828",
  },
  label: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#D1D5DB",
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#C62828",
    borderRadius: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  footerText: {
    color: "white",
    fontSize: 14,
    marginBottom: 8,
  },
});
