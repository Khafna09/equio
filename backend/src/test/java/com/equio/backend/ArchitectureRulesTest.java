package com.equio.backend;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

class ArchitectureRulesTest {

    private final JavaClasses applicationClasses = new ClassFileImporter()
            .importPackagesOf(BackendApplication.class);

    @Test
    void controllersMustNotAccessRepositoriesDirectly() {
        noClasses()
                .that().resideInAPackage("..controllers..")
                .should().dependOnClassesThat().resideInAPackage("..repositories..")
                .because("controllers delegate business and persistence work to services")
                .check(applicationClasses);
    }

    @Test
    void domainModelsMustNotDependOnDeliveryOrPersistenceLayers() {
        noClasses()
                .that().resideInAnyPackage("..entities..", "..dto..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..controllers..", "..services..", "..repositories..")
                .because("domain data must remain independent from delivery and persistence orchestration")
                .check(applicationClasses);
    }

    @Test
    void layerTypesMustRemainInTheirExpectedPackages() {
        classes()
                .that().haveSimpleNameEndingWith("Controller")
                .should().resideInAPackage("..controllers..")
                .andShould().bePublic()
                .check(applicationClasses);

        classes()
                .that().haveSimpleNameEndingWith("Repository")
                .should().resideInAPackage("..repositories..")
                .check(applicationClasses);
    }

    @Test
    void servicesMustNotAccessRepositoriesOwnedByAnotherModule() {
        assertNoForeignRepositoryAccess("budgets", "savings", "transactions", "users");
        assertNoForeignRepositoryAccess("savings", "budgets", "transactions", "users");
        assertNoForeignRepositoryAccess("transactions", "budgets", "savings", "users");
        assertNoForeignRepositoryAccess("users", "budgets", "savings", "transactions");
        assertNoForeignRepositoryAccess("dashboard", "budgets", "savings", "transactions", "users");
    }

    @Test
    void applicationServicesMustKeepEstablishedDependencyDirection() {
        noClasses()
                .that().resideInAPackage("..transactions.services..")
                .should().dependOnClassesThat().resideInAPackage("..budgets.services..")
                .because("transaction outcomes are published as events instead of calling budgets directly")
                .check(applicationClasses);
        noClasses()
                .that().resideInAPackage("..budgets.services..")
                .should().dependOnClassesThat().resideInAPackage("..savings.services..")
                .because("budget lifecycle events are handled by the savings module")
                .check(applicationClasses);
    }

    private void assertNoForeignRepositoryAccess(String owner, String... foreignModules) {
        String[] foreignRepositoryPackages = java.util.Arrays.stream(foreignModules)
                .map(module -> ".." + module + ".repositories..")
                .toArray(String[]::new);
        noClasses()
                .that().resideInAPackage(".." + owner + ".services..")
                .should().dependOnClassesThat().resideInAnyPackage(foreignRepositoryPackages)
                .because("services must collaborate through the owning module's application services")
                .check(applicationClasses);
    }
}
