/**
 * Vue "Mon projet" - Gestion du projet actif et autres projets
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import ParametresProjetComponent from '../ParametresProjetComponent';

export default function MonProjetView() {
  return (
    <View style={styles.container}>
      <ParametresProjetComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

