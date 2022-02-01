import { NgModule } from "@angular/core";
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule} from '@angular/material/badge';
import { MatCardModule} from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';


const MaterialComponents = [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatBadgeModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatTableModule

]

@NgModule ({

  imports:[MaterialComponents],

  exports: [MaterialComponents, ],
})

export class MaterialModule {}
